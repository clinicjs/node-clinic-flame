'use strict'

const { test } = require('tap')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')
const ClinicFlame = require('../index.js')

test('cmd - test collect - works with nonzero exit code', function (t) {
  const tool = new ClinicFlame()

  function cleanup (err, dirname) {
    t.ifError(err)
    t.match(dirname, /^[0-9]+\.clinic-flame$/)
    rimraf(dirname, (err) => {
      t.ifError(err)
      t.end()
    })
  }

  tool.collect(
    [process.execPath, '-e', 'throw new Error()'],
    function (err, dirname) {
      if (err) return cleanup(err, dirname)

      try {
        fs.accessSync(path.join(dirname, `${path.basename(dirname)}-systeminfo`))
        fs.accessSync(path.join(dirname, `${path.basename(dirname)}-samples`))
        fs.accessSync(path.join(dirname, `${path.basename(dirname)}-inlinedfunctions`))
      } catch (err) {
        return cleanup(err, dirname)
      }

      cleanup(null, dirname)
    }
  )
})

test('cmd - test collect - errors on SIGKILL', {
  skip: 'SIGKILL handling not implemented yet in 0x'
}, function (t) {
  const tool = new ClinicFlame()

  tool.collect(
    [process.execPath, '-e', 'process.kill(process.pid, 9)'],
    function (err, dirname) {
      t.ok(err)
      t.equal(dirname, undefined)
      t.end()
    }
  )
})
