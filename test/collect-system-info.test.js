'use strict'

const fs = require('fs')
const path = require('path')
const { test } = require('tap')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const systemInfo = require('../collect/system-info.js')

function mock0x (dataPath, data) {
  mkdirp.sync(dataPath)
  fs.writeFileSync(path.join(dataPath, 'meta.json'), JSON.stringify(data))
}

test('collect - system info - main directory', function (t) {
  const dataPath = '.test0.clinic-flame'
  mock0x(dataPath, {
    argv: ['./test/fixtures/inspect']
  })
  t.on('end', () => rimraf.sync(dataPath))

  t.equal(systemInfo(dataPath).mainDirectory, path.resolve('./test/fixtures'))
  t.end()
})

test('collect - system info - main directory - default to cwd', function (t) {
  const dataPath = '.test1.clinic-flame'
  mock0x(dataPath, {
    argv: ['-e', 'console.log("hi")']
  })
  t.on('end', () => rimraf.sync(dataPath))

  t.equal(systemInfo(dataPath).mainDirectory, path.resolve('.'))
  t.end()
})
