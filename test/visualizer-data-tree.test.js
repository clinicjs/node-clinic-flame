const test = require('tap').test
const DataTree = require('../visualizer/data-tree.js')

test('visualizer - data tree - sort frames by code area and stack top value', {
  skip: 'currently disabled by the comment in data-tree.js'
}, (t) => {
  const rootNode = {
    name: 'all stacks',
    value: 2,
    onStackTop: { base: 2 },
    // Core totals 200
    // Fastify totals 260
    // → fastify should be first
    children: [
      { category: 'deps', typeTEMP: 'fastify', value: 100, onStackTop: { base: 100 }, children: [] },
      { category: 'all-core', type: 'core', value: 200, onStackTop: { base: 200 }, children: [] },
      { category: 'deps', typeTEMP: 'fastify', value: 20, onStackTop: { base: 20 }, children: [] },
      { category: 'app', typeTEMP: '.', value: 115, onStackTop: { base: 115 }, children: [] },
      { category: 'app', typeTEMP: '.', value: 116, onStackTop: { base: 116 }, children: [] },
      { category: 'deps', typeTEMP: 'fastify', value: 40, onStackTop: { base: 40 }, children: [] },
      { category: 'deps', typeTEMP: 'fastify', value: 100, onStackTop: { base: 100 }, children: [] }
    ]
  }

  const tree = new DataTree({
    merged: rootNode,
    unmerged: rootNode,
    appName: 'test',
    pathSeparator: '/'
  })

  tree.update()
  const sorted = tree.activeNodes().slice()
    .sort(tree.getFilteredStackSorter())

  // Use match() rather than same(), because DataTree adds some properties
  // like `onStackTop.asViewed` that are not relevant for this test
  t.match(sorted, [
    { category: 'deps', typeTEMP: 'fastify', value: 100 },
    { category: 'deps', typeTEMP: 'fastify', value: 100 },
    { category: 'deps', typeTEMP: 'fastify', value: 40 },
    { category: 'deps', typeTEMP: 'fastify', value: 20 },
    { category: 'app', typeTEMP: '.', value: 116 },
    { category: 'app', typeTEMP: '.', value: 115 },
    { category: 'all-core', type: 'core', value: 200 }
  ])

  tree.exclude.add('app')
  tree.update()

  const sorted2 = tree.activeNodes().slice()
    .sort(tree.getFilteredStackSorter())

  t.match(sorted2, [
    { category: 'deps', typeTEMP: 'fastify', value: 100 },
    { category: 'deps', typeTEMP: 'fastify', value: 100 },
    { category: 'deps', typeTEMP: 'fastify', value: 40 },
    { category: 'deps', typeTEMP: 'fastify', value: 20 },
    { category: 'all-core', type: 'core', value: 200 },
    // NOTE these are not sorted by value—they don't need to be
    // If this test starts failing we should change the test so it doesn't rely on this order
    // (or change the implementation so it sorts hidden frames by _something_)
    { category: 'app', typeTEMP: '.', value: 115 },
    { category: 'app', typeTEMP: '.', value: 116 }
  ])

  t.end()
})
