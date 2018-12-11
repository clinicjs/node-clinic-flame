'use strict'

const { test } = require('tap')
const FrameNode = require('../analysis/frame-node.js')
const collectCodeAreas = require('../analysis/code-areas.js')

const linux = {
  mainDirectory: '/home/clinic',
  pathSeparator: '/',
  nodeVersions: { node: '11.3.0' }
}

function byProps (properties, systemInfo, appName = 'some-app') {
  const tree = new FrameNode(properties)
  tree.walk((node) => {
    node.categorise(systemInfo, appName)
    node.format(systemInfo)
  })
  return tree
}

test('analysis - code areas - contains basic areas', (t) => {
  const merged = byProps({ name: 'fn /home/clinic/code/app.js:1:8' }, linux)
  const codeAreas = collectCodeAreas({ merged, unmerged: merged })
  t.ok(codeAreas.some((area) => area.id === 'app'))
  t.ok(codeAreas.some((area) => area.id === 'deps'))
  t.ok(codeAreas.some((area) => area.id === 'all-v8'))
  t.end()
})

test('analysis - code areas - identifies dependency areas', (t) => {
  const merged = byProps({
    name: 'fn /home/clinic/code/node_modules/fastify/index.js:1:8',
    children: [{
      name: 'fn2 /home/clinic/code/node_modules/lol/index.js:1:8'
    }]
  }, linux)
  const codeAreas = collectCodeAreas({ merged, unmerged: merged })
  const depArea = codeAreas.find((area) => area.id === 'deps')

  t.ok(Array.isArray(depArea.children))
  t.equal(depArea.children.length, 2)
  const fastifyArea = depArea.children[0]
  const lolArea = depArea.children[1]
  t.equal(fastifyArea.id, 'fastify')
  t.equal(fastifyArea.excludeKey, 'deps:fastify')
  t.equal(lolArea.id, 'lol')
  t.equal(lolArea.excludeKey, 'deps:lol')
  // TODO maybe this should be shown for 2 deps?
  // see comment in analysis/code-areas.js for current reasoning
  t.equal(depArea.childrenVisibilityToggle, false)
  t.end()
})

test('analysis - code areas - identifies inlined dependency areas', (t) => {
  const merged = byProps({
    name: 'fn /home/clinic/code/node_modules/fastify/index.js:1:8',
    children: [{
      name: 'fn2 /home/clinic/code/node_modules/lol/index.js:1:8'
    }]
  }, linux)
  const unmerged = byProps({
    name: 'fn /home/clinic/code/node_modules/fastify/index.js:1:8',
    children: [{
      name: 'inlined /home/clinic/code/node_modules/smol-function/smol-function.js:10:1',
      children: [{
        name: 'fn2 /home/clinic/code/node_modules/lol/index.js:1:8'
      }]
    }]
  }, linux)

  const codeAreas = collectCodeAreas({ merged, unmerged })
  const depArea = codeAreas.find((area) => area.id === 'deps')

  t.ok(Array.isArray(depArea.children))
  t.equal(depArea.children.length, 3)
  // "smol-function" sorts last alphabetically
  const inlinedArea = depArea.children[2]
  t.equal(inlinedArea.id, 'smol-function')
  t.equal(inlinedArea.excludeKey, 'deps:smol-function')
  t.end()
})
