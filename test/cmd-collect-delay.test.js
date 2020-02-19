const path = require('path')
const { test } = require('tap')
const rimraf = require('rimraf')
const ClinicFlame = require('../index.js')

test('cmd - test collect - 1s collect delay', (t) => {
  const tool = new ClinicFlame({ debug: true, collectDelay: 1000 })

  function delayOneSecond () {
    setTimeout(() => {
      console.log('return after one second')
      return false
    }, 1000)
  }

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

      delayOneSecond()

      const getLoggingPaths = require('../collect/get-logging-paths')
      const analyse = require('../analysis')
      const paths = getLoggingPaths({ path: dirname })
      analyse(paths).then((result) => {
        console.log('RES', result)
      })

      cleanup(null, dirname)
    }
  )
})
