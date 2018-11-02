const test = require('tap').test
const History = require('../visualizer/history.js')

test('visualizer - history - compact exclusion set serialization', (t) => {
  const h = new History()
  h.availableExclusions = [
    'a',
    'b',
    'c',
    'd',
    'e'
  ]

  function check (excludes, expected) {
    const serialized = h.serializeExcludes(excludes)
    t.same(serialized, expected)
    t.same(h.deserializeExcludes(serialized), excludes)
  }

  t.throws(() => {
    h.serializeExcludes(['a', 'b'])
  }, /must be a Set/)

  check(new Set(['a', 'b', 'c', 'd', 'e']), '1f') // 0b11111
  check(new Set(['a', 'e']), '11') // 0b10001
  check(new Set([]), '0') // 0b00000
  check(new Set(['c']), '4')

  t.end()
})
