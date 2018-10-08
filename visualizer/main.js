'use strict'

const Ui = require('./ui.js')

const ui = new Ui('main')
ui.initializeElements()

// Potentially very large data, so don't delay initial UI frame draw.
// TODO: look into data processing in a worker, share logic with Bubbleprof
setTimeout(() => {
  const dataTree = require('./data.json')
  ui.setData(dataTree)
})
