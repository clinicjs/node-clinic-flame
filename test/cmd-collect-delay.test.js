const fs = require('fs')
const path = require('path')
const { test } = require('tap')
const rimraf = require('rimraf')
const ClinicFlame = require('../index.js')

test('cmd - test collect - 1s collect delay', (t) => {
  const tool = new ClinicFlame({ debug: true, collectDelay: 1500 })

  function cleanup (err, dirname) {
    t.ifError(err)
    t.match(dirname, /^[0-9]+\.clinic-flame$/)

    rimraf(dirname, (err) => {
      t.ifError(err)
      t.end()
    })
  }

  function countFn (ticks, name) {
    return ticks.reduce((total, tick) => {
      return tick.reduce((acc, frame) => {
        if (frame.name.includes(name)) {
          return acc + 1
        }
        return acc
      }, total)
    }, 0)
  }

  tool.collect(
    [process.execPath, path.join('test', 'fixtures', 'delay.js')],
    function (err, dirname) {
      if (err) return cleanup(err, dirname)

      const getLoggingPaths = require('../collect/get-logging-paths')
      const analyse = require('../analysis')
      const paths = getLoggingPaths({ path: dirname })
      analyse(paths).then((result) => {
        const ticks = JSON.parse(fs.readFileSync(paths['/samples'], 'utf8'))
        t.comment(`first ticks delays are: ${ticks[0].map(frame => frame.tm)}`)

        const c1 = countFn(ticks, 'delayOneSecond')
        t.equal(c1, 0, `delayOneSecond showed up ${c1} times out of ${ticks.length} ticks`)
        const c2 = countFn(ticks, 'delayTwoSecond')
        t.ok(c2 > 0, `delayTwoSecond showed up ${c2} times`)

        cleanup(null, dirname)
      })
    }
  )
})
