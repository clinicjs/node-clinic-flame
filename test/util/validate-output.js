'use strict'

// Causes timeout, needs optimizing or replacing

const dataJsonRegex = new RegExp(
  // Check for presence of these expected stringified-JSON segments, with or without " around keys.
  // This is the expected order, but there's no need to strictly enforce JSON key order.
  // If a test sample is so small there's no "?regexp"? with a preceding "?native"? with a
  // preceding "?init"? etc (<9 items), probably something is wrong with the sample.
  'merged"?:{' + '(?:.*?' +
  'id"?:\\d+' + '[,}].*?' +
  'name"?:"?.+?"?' + '[,}].*?' +
  'type"?:"?.+?"?' + '[,}].*?' +
  'value"?:\\d+?\\.?\\d*?' + '[,}].*?' +
  'base"?:\\d' + '[,}].*?' +
  'app"?:\\d' + '[,}].*?' +
  'deps"?:\\d' + '[,}].*?' +
  'core"?:\\d' + '[,}].*?' +
  'v8"?:\\d' + '[,}].*?' +
  'cpp"?:\\d' + '[,}].*?' +
  'init"?:\\d' + '[,}].*?' +
  'native"?:\\d' + '[,}].*?' +
  'regexp"?:\\d' + '[,}])'
)

function containsData (contentString) {
  return dataJsonRegex.test(JSON.stringify(contentString))
}

// More exports will be added to this file, so this function should be required by name
module.exports = { containsData }
