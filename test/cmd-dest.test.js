const fs = require('fs')
const path = require('path')
const { test } = require('tap')
const rimraf = require('rimraf')
const ClinicFlame = require('../index.js')

test('cmd - test collect - custom output destination', (t) => {
  const tool = new ClinicFlame({ debug: true, dest: 'test-output-destination' })

  function cleanup (err, dirname) {
    t.ifError(err)
    t.match(dirname, /^test-output-destination[/\\][0-9]+\.clinic-flame$/)

    rimraf('test-output-destination', (err) => {
      t.ifError(err)
      t.end()
    })
  }

  tool.collect(
    [process.execPath, path.join('test', 'fixtures', 'inspect.js')],
    function (err, dirname) {
      if (err) return cleanup(err, dirname)

      t.ok(fs.statSync(dirname).isDirectory())

      tool.visualize(dirname, `${dirname}.html`, (err) => {
        if (err) return cleanup(err, dirname)

        t.ok(fs.statSync(`${dirname}.html`).isFile())

        cleanup(null, dirname)
      })
    }
  )
})
