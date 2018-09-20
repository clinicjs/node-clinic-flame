'use strict'

const fs = require('fs')
const path = require('path')
const { test } = require('tap')
const rimraf = require('rimraf')
const ClinicFlame = require('../index.js')

test('cmd - test collect - data exists', function (t) {
  const tool = new ClinicFlame()

  function cleanup (err, dirname) {
    t.ifError(err)

    let count = 0
    function callback (err) {
      t.ifError(err)
      if (++count === 2) {
        t.end()
      }
    }
    t.match(dirname, /^[0-9]+\.clinic-flame$/)
    rimraf(dirname, callback)
    fs.unlink(dirname + '.html', callback)
  }

  tool.collect(
    [process.execPath, path.join('test', 'fixtures', 'inspect.js')],
    function (err, dirname) {
      if (err) return cleanup(err, dirname)

      tool.visualize(dirname, dirname + '.html', function (err) {
        if (err) return cleanup(err, dirname)

        fs.readFile(dirname + '.html', function (err, content) {
          if (err) return cleanup(err, dirname)

          t.ok(content.length > 1024 * 100)
          cleanup(null, dirname)
        })
      })
    }
  )
})

test('cmd - test visualization - missing data', function (t) {
  const tool = new ClinicFlame({ debug: true })

  tool.visualize(
    'missing.clinic-flame',
    'missing.clinic-flame.html',
    function (err) {
      // The message is set by 0x.
      t.match(err.message, /Invalid data path provided/)
      t.end()
    }
  )
})

test('cmd - test collect - system info and 0x directory', function (t) {
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
    [process.execPath, path.join('test', 'fixtures', 'inspect.js')],
    function (err, dirname) {
      if (err) return cleanup(err, dirname)

      const basename = path.basename(dirname)
      const systeminfo = JSON.parse(fs.readFileSync(path.join(dirname, `${basename}-systeminfo`)))
      // check that 0x's meta.json exists and is valid JSON
      JSON.parse(fs.readFileSync(path.join(dirname, `${basename}-0x-data/meta.json`)))

      t.ok(fs.statSync(systeminfo.mainDirectory).isDirectory())

      cleanup(null, dirname)
    }
  )
})
