const path = require('path')
const { test } = require('tap')
const rimraf = require('rimraf')
const ClinicFlame = require('../index.js')

test('cmd - test collect - 1s collect delay', (t) => {
  const tool = new ClinicFlame({ debug: true, collectDelay: 1300 })

  function cleanup (err, dirname) {
    t.ifError(err)
    t.match(dirname, /^[0-9]+\.clinic-flame$/)

    rimraf(dirname, (err) => {
      t.ifError(err)
      t.end()
    })
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
        t.equal(searchTree(result.merged, 'delayOneSecond'), null)
        t.equal(searchTree(result.merged, 'delayTwoSecond').functionName, 'delayTwoSecond')
        cleanup(null, dirname)
      })
    }
  )
})
