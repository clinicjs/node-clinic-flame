const test = require('tap').test
const FrameNode = require('../analysis/frame-node.js')

test('analysis - copy/paste targets', (t) => {
  const systemInfo = {
    pathSeparator: '/',
    mainDirectory: '/home/clinic/code/app',
    nodeVersions: { node: '10.11.0' }
  }

  const appNode = new FrameNode({
    name: 'start /home/clinic/code/app/index.js:20:1'
  })
  appNode.categorise(systemInfo)
  appNode.anonymise(systemInfo)
  t.equal(appNode.getTarget(systemInfo), './index.js')

  const parentDirNode = new FrameNode({
    name: '(anonymous) /home/clinic/code/browserify/index.js:808:29'
  })
  parentDirNode.categorise(systemInfo)
  parentDirNode.anonymise(systemInfo)
  t.equal(parentDirNode.getTarget(systemInfo), '../browserify/index.js')

  const coreFunctionNode = new FrameNode({
    name: 'coreFunction util.js:15:7'
  })
  coreFunctionNode.categorise(systemInfo)
  t.equal(coreFunctionNode.getTarget(systemInfo), 'https://github.com/nodejs/node/blob/v10.11.0/lib/util.js#L15')

  const internalFunctionNode = new FrameNode({
    name: 'deprecate internal/util.js:15:1'
  })
  internalFunctionNode.categorise(systemInfo)
  t.equal(internalFunctionNode.getTarget(systemInfo), 'https://github.com/nodejs/node/blob/v10.11.0/lib/internal/util.js#L15')

  t.end()
})
