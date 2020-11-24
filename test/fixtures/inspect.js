'use strict'

const util = require('util')

// Existing types should be:
//
// INIT
// CPP
// V8
// CORE
// ... more
const obj = {
  a: true,
  b: 0,
  c: '',
  d: [],
  e: {},
  f: [1, 2, 3, 4, 5]
}
obj.circular = obj

for (let i = 0; i < 10000; i += 1) {
  util.inspect(obj, { depth: Infinity })
}
