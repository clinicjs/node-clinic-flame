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

    x({
      argv,
      onPort: this.detectPort ? onPort : undefined,
      pathToNodeBinary: args[0],
      collectOnly: true,
      outputDir: '{pid}.clinic-flame',
      workingDir: '.'
    })
      .then(function (dir) {
        process.nextTick(cb, null, dir)
      })
      .catch(function (err) {
        process.nextTick(cb, err)
      })

    function onPort (port, cb) {
      self.emit('port', Number(port.toString()), null, cb)
    }
  }

  visualize (outputDir, outputHtml, cb) {
    x({
      visualizeOnly: outputDir,
      workingDir: '.'
    })
      .then(function () {
        fs.rename(path.join(outputDir, 'flamegraph.html'), outputHtml, cb)
      })
      .catch(function (err) {
        process.nextTick(cb, err)
      })
  }
}

module.exports = ClinicFlame
