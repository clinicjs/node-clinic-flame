const events = require('events')
const x = require('0x')
const path = require('path')
const fs = require('fs')
const rimraf = require('rimraf')
const getLoggingPaths = require('./collect/get-logging-paths.js')
const systemInfo = require('./collect/system-info.js')
const inlinedFunctions = require('./collect/inlined-functions.js')
const analyse = require('./analysis/index.js')

class ClinicFlame extends events.EventEmitter {
  constructor (opts) {
    super()
    this.detectPort = !!(opts && opts.detectPort)
  }

  collect (args, cb) {
    const argv = args.slice(1)
    const self = this

    const paths = getLoggingPaths()

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

      const paths = getLoggingPaths({ identifier: pid })
      fs.writeFile(paths['/systeminfo'], JSON.stringify(systemInfo(paths['/0x-data/']), null, 2), next)
      fs.writeFile(paths['/inlinedfunctions'], JSON.stringify(inlinedFunctions(paths['/0x-data/'])), next)

      // TODO maybe gzip this? it can be very big and gzip can easily save 80~95%
      fs.rename(path.join(paths['/0x-data/'], 'ticks.json'), paths['/samples'], next)
    }

    function onPort (port, cb) {
      self.emit('port', Number(port.toString()), null, cb)
    }
  }

  visualize (outputDir, outputHtml, cb) {
    const paths = getLoggingPaths({ path: outputDir })

    callbackify(analyse(paths), (err, data) => {
      if (err) return cb(err)
      // data.merged → call tree where optimized and unoptimized versions of the same function are in a single frame
      // data.unmerged → call tree where optimized and unoptimized versions of the same function are in separate frames

      // TODO remove this, it's just here to have a way to view the result
      // of the analysis bc we don't have a visualizer yet
      const html = `Inspect the 'trees' variable in the console. <script>trees = ${JSON.stringify(data)}</script>`
      fs.writeFile(outputHtml, html, (err) => {
        // istanbul ignore if
        if (err) return cb(err)

        cb(null, paths['/'])
      })
    })
  }
}

function callbackify (p, cb) {
  p.then(val => process.nextTick(cb, null, val)).catch(err => process.nextTick(cb, err))
}

module.exports = ClinicFlame
