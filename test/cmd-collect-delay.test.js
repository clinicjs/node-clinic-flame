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

  function countFn (tree, name) {
    let results = 0
    tree.walk((node) => {
      if (node.name.includes(name)) {
        results += 1
      }
    })
    return results
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
        const c1 = countFn(result.merged, 'delayOneSecond')
        t.equal(c1, 0, `delayOneSecond showed up ${c1} times`)
        const c2 = countFn(result.merged, 'delayTwoSecond')
        t.ok(c2 > 0, `delayTwoSecond showed up ${c2} times`)
        t.equal(searchTree(result.merged, 'delayOneSecond'), undefined)
        t.equal(searchTree(result.merged, 'delayTwoSecond').functionName, 'delayTwoSecond')
        cleanup(null, dirname)
      })
    }
  )
})
