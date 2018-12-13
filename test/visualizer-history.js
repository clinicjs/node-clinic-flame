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

  check(new Set(['a', 'b', 'c', 'd', 'e']), 'f800') // 0b11111
  check(new Set(['a', 'e']), '8800') // 0b10001
  check(new Set([]), '0') // 0b00000
  check(new Set(['c']), '2000')

  // A reasonably sized exclusion list with 20 or so dependencies
  h.availableExclusions = 'abcdefghijklmnopqrstuvwxyz'.split('')
  check(new Set(['a', 'r', 'm', 'q', 'z']), '8008-c040') // 0b11111

  // A big app with many 100s of deps
  h.availableExclusions = []
  for (let i = 0; i < 1000; i++) {
    h.availableExclusions.push(`ex${i}`)
  }
  check(new Set(['ex17', 'ex645', 'ex123', 'ex246', 'ex643']), '0-4000-0-0-0-0-0-10-0-0-0-0-0-0-0-200-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-1400-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0-0') // 0b11111
  t.end()
})
