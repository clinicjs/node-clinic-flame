'use strict'

const events = require('events')
const x = require('0x')
const path = require('path')
const fs = require('fs')
const rimraf = require('rimraf')
const getLoggingPaths = require('./collect/get-logging-paths.js')
const systemInfo = require('./collect/system-info.js')
const inlinedFunctions = require('./collect/inlined-functions.js')
const analyse = require('./analysis/index.js')
var inlineSvg = require('browserify-inline-svg')

// TODO: These will likely be moved to a generic Clinic tool visualizer
const { promisify } = require('util')
const readFile = promisify(require('fs').readFile)
const postcss = require('postcss')
const postcssImport = require('postcss-import')
// const minifyStream = require('minify-stream')
const streamTemplate = require('stream-template')
const pump = require('pump')
const browserify = require('browserify')
const envify = require('loose-envify/custom')

class ClinicFlame extends events.EventEmitter {
  constructor (settings = {}) {
    super()

    const {
      detectPort = false,
      debug = false,
      dest = null
    } = settings

    this.detectPort = detectPort
    this.debug = debug
    this.path = dest
  }

  collect (args, cb) {
    const argv = args.slice(1)
    const self = this

    const paths = getLoggingPaths({
      path: this.path,
      identifier: '{pid}' // replaced with actual pid by 0x
    })

    callbackify(x({
      argv,
      onPort: this.detectPort ? onPort : undefined,
      pathToNodeBinary: args[0],
      collectOnly: true,
      writeTicks: true,
      outputDir: paths['/0x-data/'],
      workingDir: '.' // 0x temporary working files, doesn't support placeholders like {pid}
    }), done)

    function done (err, dir) {
      /* istanbul ignore if: currently hard to cause, we can cover this when 0x returns an error on SIGKILL */
      if (err) return cb(err)
      const pidMatch = dir.match(/(?:\/|\\)(\d+)\.clinic-flame-0x-data/)

      const pid = pidMatch ? pidMatch[1]
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

      const paths = getLoggingPaths({ path: self.path, identifier: pid })
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
    const nearFormLogoPath = path.join(__dirname, 'visualizer', 'nearform-logo.svg')
    const clinicFaviconPath = path.join(__dirname, 'visualizer', 'clinic-favicon.png.b64')

    // add logos
    const logoFile = fs.createReadStream(logoPath)
    const nearFormLogoFile = fs.createReadStream(nearFormLogoPath)
    const clinicFaviconBase64 = fs.createReadStream(clinicFaviconPath)

    const b = browserify({
      'basedir': __dirname,
      'debug': this.debug,
      'noParse': [fakeDataPath]
    })
    b.require({
      'source': JSON.stringify(data),
      'file': fakeDataPath
    })
    b.add(scriptPath)
    b.transform('brfs')
    b.transform(envify({
      DEBUG_MODE: this.debug,
      PRESENTATION_MODE: process.env.PRESENTATION_MODE
    }))

    let scriptFile = b
      .bundle()
      .pipe(inlineSvg({
        basePath: __dirname
      }))

    // create style-file stream
    const processor = postcss([
      postcssImport()
    ])
    const styleFile = readFile(stylePath, 'utf8')
      .then((css) => processor.process(css, {
        from: stylePath,
        map: this.debug ? { inline: true } : false
      }))
      .then((result) => {
        return result.css
      })

    // This basic HTML template will be migrated to node-clinic-common and shared between tools,
    // piping in tool name, logo etc. Customise tool-specific html in node-clinic-toolname/visualizer
    const outputFile = streamTemplate`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf8">
          <style>${styleFile}</style>
          <meta name="viewport" content="width=device-width">
          <title>Clinic Flame</title>
          <link rel="shortcut icon" type="image/png" href="${clinicFaviconBase64}">
        </head>
        <body>
          <div id="header">
            <div id="banner">
              <a id="main-logo" href="https://github.com/nearform/node-clinic-flame" title="Clinic Flame on GitHub" target="_blank">
                ${logoFile}<span>Flame</span>
              </a>
              <a id="company-logo" href="https://nearform.com" title="nearForm" target="_blank">
                ${nearFormLogoFile}
              </a>
            </div>
          </div>

          <main></main>
          <script>${scriptFile}</script>
        </body>
      </html>
    `

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
