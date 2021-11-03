'use strict'

const { test } = require('tap')

test('Collect - system info - check data', function (t) {
  const version = require('../version')

  const packageVersion = require('../package.json').version
  const ZeroXVersion = require('0x/package.json').version

  t.equal(
    version,
    `${packageVersion} (0x v${ZeroXVersion})`
  )
  t.end()
})
