'use strict'
require('@nearform/clinic-common/spinner')
const Ui = require('./ui.js')

const ui = new Ui('main')
ui.initializeElements()

// TODO: see if there's a way to load this asyncronously (in case of huge data) that works with puppeteer
const dataTree = require('./data.json')
ui.setData(dataTree)

// Select hottest frame, after frame visibility has been set in d3-fg
// And only if no node was selected during initialization by some other means
// (eg from parsing the history hash).
ui.draw()
if (!ui.selectedNode || ui.selectedNode.category === 'none') {
  ui.selectHottestNode()
}

if (process.env.DEBUG_MODE) {
  window.ui = ui
}
