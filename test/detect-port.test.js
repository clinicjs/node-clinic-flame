'use strict'

const { test } = require('tap')
const http = require('http')
const fs = require('fs')
const rimraf = require('rimraf')
const ClinicFlame = require('../index.js')
// TODO: times out intermitently due to data size, optimize or stream in string
// const { containsData } = require('./util/validate-output.js')

test('cmd - collect - detect server port', function (t) {
  const tool = new ClinicFlame({ detectPort: true })

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
    [process.execPath, '-e', `
      const http = require('http')
      http.createServer(onrequest).listen(0)

      function onrequest (req, res) {
        this.close()
        res.end('from server')
      }
    `],
    function (err, dirname) {
      if (err) return cleanup(err, dirname)

      tool.visualize(dirname, dirname + '.html', function (err) {
        if (err) return cleanup(err, dirname)

        fs.readFile(dirname + '.html', function (err, content) {
          if (err) return cleanup(err, dirname)

          // TODO: restore when doesn't intermitently time out
          // t.ok(containsData(content))
          t.ok(content.length > 5000)
          cleanup(null, dirname)
        })
      })
    }
  )

  tool.on('port', function (port) {
    t.ok(typeof port === 'number')
    t.ok(port > 0)

    http.get(`http://127.0.0.1:${port}`, function (res) {
      const buf = []
      res.on('data', data => buf.push(data))
      res.on('end', function () {
        t.same(Buffer.concat(buf), Buffer.from('from server'))
      })
    })
  })
})
