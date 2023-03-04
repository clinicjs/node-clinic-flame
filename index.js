'use strict'

const events = require('events')
const x = require('0x')
const path = require('path')
const fs = require('fs')
const { performance } = require('perf_hooks')
const rimraf = require('rimraf')
const getLoggingPaths = require('./collect/get-logging-paths.js')
const systemInfo = require('./collect/system-info.js')
const inlinedFunctions = require('./collect/inlined-functions.js')
const analyse = require('./analysis/index.js')
const pump = require('pump')
const buildJs = require('@clinic/clinic-common/scripts/build-js')
const buildCss = require('@clinic/clinic-common/scripts/build-css')
const mainTemplate = require('@clinic/clinic-common/templates/main')

class ClinicFlame extends events.EventEmitter {
  constructor (settings = {}) {
    super()

    const {
      detectPort = false,
      debug = false,
      dest = null,
      kernelTracing = false,
      name,
    } = settings

    this.detectPort = detectPort
    this.debug = debug
    this.path = dest
    this.kernelTracing = kernelTracing
    this.startTime = 0
    this.elapsedTime = 0
    this.name = name
  }

  collect (args, cb) {
    const argv = args.slice(1)
    const self = this

    const paths = getLoggingPaths({
      path: this.path,
      identifier: this.name || '{pid}',
      // '{pid}' is replaced with actual pid by 0x
    })

    this.startTime = performance.now()
    callbackify(x({
      argv,
      onPort: this.detectPort ? onPort : undefined,
      onProcessExit: () => {
        this.elapsedTime = Math.round((performance.now() - this.startTime) / 1000)
        this.emit('analysing')
      },
      pathToNodeBinary: args[0],
      collectOnly: true,
      writeTicks: true,
      kernelTracing: this.kernelTracing,
      outputDir: paths['/0x-data/'],
      workingDir: '.' // 0x temporary working files, doesn't support placeholders like {pid}
    }), done)

    function done (err, dir) {
      /* istanbul ignore if: currently hard to cause, we can cover this when 0x returns an error on SIGKILL */
      if (err) return cb(err)
      const pidMatch = dir.match(/(?:\/|\\)(\d+)\.clinic-flame-0x-data/)

      const pid = pidMatch
        ? pidMatch[1]
        /* istanbul ignore next: can't reliably cause 0x to detect no pid without hacking 0x */
        : 'UNKNOWN_PID' // 0x's fallback if, somehow, no PID was detected

      let count = 0
      function next (err) {
        // istanbul ignore if
        if (err) return cb(err)

        count += 1
        if (count < 3) return

        rimraf(paths['/0x-data/'], (err) => {
          // istanbul ignore if
          if (err) return cb(err)
          cb(null, paths['/'])
        })
      }

      // When a name is provided, an override is expected.
      // So, there's no need to pass the identifier
      const paths = getLoggingPaths({ path: self.path, identifier: self.name || pid })

      fs.writeFile(paths['/systeminfo'], JSON.stringify(systemInfo(paths['/0x-data/']), null, 2), next)
      fs.writeFile(paths['/inlinedfunctions'], JSON.stringify(inlinedFunctions(paths['/0x-data/'])), next)

      // TODO maybe gzip this? it can be very big and gzip can easily save 80~95%
      fs.rename(path.join(paths['/0x-data/'], 'ticks.json'), paths['/samples'], next)
    }

    function onPort (port, cb) {
      self.emit('port', Number(port.toString()), null, cb)
    }
  }

  visualize (outputDir, outputFilename, callback) {
    const paths = getLoggingPaths({ path: outputDir })

    callbackify(analyse(paths), (err, data) => {
      if (err) return callback(err)
      // data.merged → call tree where optimized and unoptimized versions of the same function are in a single frame
      // data.unmerged → call tree where optimized and unoptimized versions of the same function are in separate frames

      this.writeHtml(data, outputFilename, callback)
    })
  }

  writeHtml (data, outputFilename, callback) {
    // TODO: migrate most of this to clinic-common
    const fakeDataPath = path.join(__dirname, 'visualizer', 'data.json')
    const stylePath = path.join(__dirname, 'visualizer', 'style.css')
    const scriptPath = path.join(__dirname, 'visualizer', 'main.js')
    const logoPath = path.join(__dirname, 'visualizer/assets', 'flame-logo.svg')
    const clinicFaviconPath = path.join(__dirname, 'visualizer', 'clinic-favicon.png.b64')

    // add logos
    const logoFile = fs.createReadStream(logoPath)
    const clinicFaviconBase64 = fs.createReadStream(clinicFaviconPath)

    const flameVersion = require('./package.json').version

    // build JS
    const scriptFile = buildJs({
      basedir: __dirname,
      debug: this.debug,
      fakeDataPath,
      scriptPath,
      beforeBundle: b => b.require({
        source: JSON.stringify(data),
        file: fakeDataPath
      }),
      env: {
        PRESENTATION_MODE: process.env.PRESENTATION_MODE
      }
    })

    // build CSS
    const styleFile = buildCss({
      stylePath,
      debug: this.debug
    })

    // generate HTML
    const outputFile = mainTemplate({
      favicon: clinicFaviconBase64,
      title: 'Clinic Flame',
      styles: styleFile,
      script: scriptFile,
      elapsedTime: `${this.elapsedTime}s`,
      headerLogoUrl: 'https://clinicjs.org/flame/',
      headerLogoTitle: 'Clinic Flame on Clinicjs.org',
      headerLogo: logoFile,
      headerText: 'Flame',
      toolVersion: flameVersion,
      uploadId: outputFilename.split('/').pop().split('.html').shift(),
      body: '<main></main>'
    })

    pump(
      outputFile,
      fs.createWriteStream(outputFilename),
      callback
    )
  }
}

function callbackify (p, cb) {
  p.then(val => process.nextTick(cb, null, val)).catch(err => process.nextTick(cb, err))
}

module.exports = ClinicFlame
