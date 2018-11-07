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
      { type: 'fastify', value: 100, onStackTop: { base: 100 }, children: [] },
      { type: 'core', value: 200, onStackTop: { base: 200 }, children: [] },
      { type: 'fastify', value: 20, onStackTop: { base: 20 }, children: [] },
      { type: 'fastify', value: 40, onStackTop: { base: 40 }, children: [] },
      { type: 'fastify', value: 100, onStackTop: { base: 100 }, children: [] }
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
    { type: 'fastify', value: 100, onStackTop: { base: 100 }, children: [] },
    { type: 'fastify', value: 100, onStackTop: { base: 100 }, children: [] },
    { type: 'fastify', value: 40, onStackTop: { base: 40 }, children: [] },
    { type: 'fastify', value: 20, onStackTop: { base: 20 }, children: [] },
    { type: 'core', value: 200, onStackTop: { base: 200 }, children: [] }
  ])

  t.end()
})
