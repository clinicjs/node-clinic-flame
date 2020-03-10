const path = require('path')
const { test } = require('tap')
const rimraf = require('rimraf')
const ClinicFlame = require('../index.js')

test('cmd - test collect - 1s collect delay', (t) => {
  const tool = new ClinicFlame({ debug: true, collectDelay: 2000 })

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

  const searchTree = (tree, target) => {
    if (tree.name.includes(target)) {
      return tree
    }
    for (const child of tree.children) {
      const res = searchTree(child, target)

      if (res) {
        return res
      }
    }
  }

  tool.collect(
    [process.execPath, path.join('test', 'fixtures', 'delay.js')],
    function (err, dirname) {
      if (err) return cleanup(err, dirname)

      const getLoggingPaths = require('../collect/get-logging-paths')
      const analyse = require('../analysis')
      const paths = getLoggingPaths({ path: dirname })
      analyse(paths).then((result) => {
        const c1 = countFn(result.ticks, 'delayOneSecond')
        t.equal(c1, 0, `delayOneSecond showed up ${c1} times out of ${result.ticks.length} ticks`)
        const c2 = countFn(result.ticks, 'delayTwoSecond')
        t.ok(c2 > 0, `delayTwoSecond showed up ${c2} times`)
        t.equal(searchTree(result.merged, 'delayOneSecond'), undefined)
        t.equal(searchTree(result.merged, 'delayTwoSecond').functionName, 'delayTwoSecond')
        cleanup(null, dirname)
      })
    }
  )
})
