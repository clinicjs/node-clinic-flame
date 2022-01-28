const test = require('tap').test
const FrameNode = require('../analysis/frame-node.js')
const labelNodes = require('../analysis/label-nodes.js')

test('analysis - label nodes', (t) => {
  const rootNode = new FrameNode({
    name: 'start /home/clinic/code/app/index.js:20:1',
    children: [
      { name: '(anonymous) /home/clinic/code/browserify/index.js:808:29' },
      {
        name: 'xyz def.js:65:65',
        children: [
          { name: 'nested eoauhsoa/aehue/aueaeou.js:4523:5' }
        ]
      },
      { name: 'coreFunction util.js:15:7' }
    ]
  })

  const expected = {
    name: 'start /home/clinic/code/app/index.js:20:1',
    id: 0,
    children: [
      { name: '(anonymous) /home/clinic/code/browserify/index.js:808:29', id: 1 },
      {
        name: 'xyz def.js:65:65',
        id: 2,
        children: [
          { name: 'nested eoauhsoa/aehue/aueaeou.js:4523:5', id: 3 }
        ]
      },
      { name: 'coreFunction util.js:15:7', id: 4 }
    ]
  }

  labelNodes(rootNode)
  t.match(rootNode.toJSON(), expected)

  t.end()
})

test('analysis - name escaped \\', (t) => {
  const rootNode = new FrameNode({
    name: '~foo\nhome/clinic/clinic-327.js:2:13',
  })

  const expected = {
    name: 'foo /home/clinic/clinic-327.js:2:13',
    id: 0,
    children: []
  }

  labelNodes(rootNode)
  t.match(rootNode.toJSON(), expected)

  t.end()
})

test('analysis - children name escaped \\', (t) => {
  const rootNode = new FrameNode({
    name: '~(anonymous) /home/clinic/clinic-327.js:1:1 [INIT]',
    children: [{
      S: 1,
      name: '~foo\nhome/rafaelgss/repos/os/tests/clinic-327.js:2:13 [INIT]',
      value: 22,
      top: 0,
      isInit: true,
      fn: 'foo\nhome/rafaelgss/repos/os/tests/clinic-327.js:2:13 [INIT]',
      children: []
    }]
  })

  const expected = {
    name: '~(anonymous) /home/clinic/clinic-327.js:1:1 [INIT]',
    id: 0,
    children: [{
      name: 'foo /home/rafaelgss/repos/os/tests/clinic-327.js:2:13 [INIT]'
    }]
  }

  labelNodes(rootNode)
  t.match(rootNode.toJSON(), expected)

  t.end()
})
