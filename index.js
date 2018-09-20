const events = require('events')
const x = require('0x')
const path = require('path')
const fs = require('fs')
const getLoggingPaths = require('./collect/get-logging-paths.js')
const systemInfo = require('./collect/system-info.js')

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
      outputDir: paths['/0x-data/'],
      workingDir: '.' // 0x temporary working files, doesn't support placeholders like {pid}
    }), done)

    function done (err, dir) {
      if (err) return cb(err)
      const pidMatch = dir.match(/(?:\/|\\)(\d+)\.clinic-flame-0x-data/)

      const pid = pidMatch ? pidMatch[1]
        /* istanbul ignore next: can't reliably cause 0x to detect no pid without hacking 0x */
        : 'UNKNOWN_PID' // 0x's fallback if, somehow, no PID was detected

      const paths = getLoggingPaths({ identifier: pid })
      fs.writeFileSync(paths['/systeminfo'], JSON.stringify(systemInfo(paths['/0x-data/']), null, 2))

      cb(null, paths['/'])
    }

    function onPort (port, cb) {
      self.emit('port', Number(port.toString()), null, cb)
    }
  }

  visualize (outputDir, outputHtml, cb) {
    const paths = getLoggingPaths({ path: outputDir })

    callbackify(x({
      visualizeOnly: paths['/0x-data/'],
      workingDir: '.',
      pathToNodeBinary: process.execPath
    }), function (err) {
      if (err) return cb(err)
      fs.rename(path.join(paths['/0x-data/'], 'flamegraph.html'), outputHtml, cb)
    })
  }
}

function callbackify (p, cb) {
  p.then(val => process.nextTick(cb, null, val)).catch(err => process.nextTick(cb, err))
}

module.exports = ClinicFlame
