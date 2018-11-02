'use strict'

const Ui = require('./ui.js')

const ui = new Ui('main')
ui.initializeElements()

// Potentially very large data, so don't delay initial UI frame draw.
// TODO: look into data processing in a worker, share logic with Bubbleprof
setTimeout(() => {
  const dataTree = require('./data.json')
  ui.setData(dataTree)

  // Select hottest frame, after frame visibility has been set in d3-fg
  // And only if no node was selected during initialization by some other means
  // (eg from parsing the history hash).
  ui.draw()
  if (ui.selectedNode === null) {
    ui.selectHottestNode()
  }
})

if (process.env.DEBUG_MODE) {
  window.ui = ui
}
