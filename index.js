const events = require('events')
const x = require('0x')
const path = require('path')
const fs = require('fs')

class ClinicFlame extends events.EventEmitter {
  constructor (opts) {
    super()
    this.detectPort = !!(opts && opts.detectPort)
  }

  collect (args, cb) {
    const argv = args.slice(1)
    const self = this

    callbackify(x({
      argv,
      onPort: this.detectPort ? onPort : undefined,
      pathToNodeBinary: args[0],
      collectOnly: true,
      outputDir: '{pid}.clinic-flame',
      workingDir: '.'
    }), cb)

    function onPort (port, cb) {
      self.emit('port', Number(port.toString()), null, cb)
    }
  }

  visualize (outputDir, outputHtml, cb) {
    callbackify(x({
      visualizeOnly: outputDir,
      workingDir: '.'
    }), function (err) {
      if (err) return cb(err)
      fs.rename(path.join(outputDir, 'flamegraph.html'), outputHtml, cb)
    })
  }
}

function callbackify (p, cb) {
  p.then(val => process.nextTick(cb, null, val)).catch(err => process.nextTick(cb, err))
}

module.exports = ClinicFlame
