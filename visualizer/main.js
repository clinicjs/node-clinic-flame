'use strict'
require('@clinic/clinic-common/spinner')
const Ui = require('./ui.js')
const loadFonts = require('@clinic/clinic-common/behaviours/font-loader')

// Create UI
const ui = new Ui('main')

// Called on font load or timeout
const drawUi = () => {
  document.body.classList.remove('is-loading-font')
  document.body.classList.add('is-font-loaded')

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
}

// Orchestrate font loading
setTimeout(() => (
  loadFonts({
    onLoad: () => ui.emit('uiFontLoaded'),
    onTimeout: () => ui.emit('uiFontLoaded')
  })
))

drawUi()

if (process.env.DEBUG_MODE) {
  window.ui = ui
}
