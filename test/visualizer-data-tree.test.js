const test = require('tap').test
const DataTree = require('../visualizer/data-tree.js')

test('visualizer - data tree - sort frames by code area and stack top value', (t) => {
  const rootNode = {
    name: 'all stacks',
    value: 2,
    onStackTop: { base: 2 },
    // Core totals 200
    // Fastify totals 260
    // → fastify should be first
    children: [
      { category: 'deps', type: 'fastify', value: 100, onStackTop: { base: 100 }, children: [] },
      { category: 'all-core', type: 'core', value: 200, onStackTop: { base: 200 }, children: [] },
      { category: 'deps', type: 'fastify', value: 20, onStackTop: { base: 20 }, children: [] },
      { category: 'app', type: '.', value: 115, onStackTop: { base: 115 }, children: [] },
      { category: 'app', type: '.', value: 116, onStackTop: { base: 116 }, children: [] },
      { category: 'deps', type: 'fastify', value: 40, onStackTop: { base: 40 }, children: [] },
      { category: 'deps', type: 'fastify', value: 100, onStackTop: { base: 100 }, children: [] }
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
    { category: 'deps', type: 'fastify', value: 100 },
    { category: 'deps', type: 'fastify', value: 100 },
    { category: 'deps', type: 'fastify', value: 40 },
    { category: 'deps', type: 'fastify', value: 20 },
    { category: 'app', type: '.', value: 116 },
    { category: 'app', type: '.', value: 115 },
    { category: 'all-core', type: 'core', value: 200 }
  ])

  tree.exclude.add('app')
  tree.update()

  const sorted2 = tree.activeNodes().slice()
    .sort(tree.getFilteredStackSorter())

  t.match(sorted2, [
    { category: 'deps', type: 'fastify', value: 100 },
    { category: 'deps', type: 'fastify', value: 100 },
    { category: 'deps', type: 'fastify', value: 40 },
    { category: 'deps', type: 'fastify', value: 20 },
    { category: 'all-core', type: 'core', value: 200 },
    // NOTE these are not sorted by value—they don't need to be
    // If this test starts failing we should change the test so it doesn't rely on this order
    // (or change the implementation so it sorts hidden frames by _something_)
    { category: 'app', type: '.', value: 115 },
    { category: 'app', type: '.', value: 116 }
  ])

  t.end()
})
