'use strict'

const { test } = require('tap')
const ClinicFlame = require('../index.js')

test('faulty executable path', function (t) {
  const tool = new ClinicFlame()

  tool.collect(
    ['node', '-e', 'throw new Error()'],
    function (err, dirname) {
      t.ok(err)
      t.equal(err.message, 'Target subprocess error, code: 1')
      t.equal(err.code, 1)
      t.equal(dirname, undefined)
      t.end()
    }
  )
})
