'use strict'

const Ui = require('./ui.js')
const spinner = require('@nearform/clinic-common/spinner')
const askBehaviours = require('@nearform/clinic-common/behaviours/ask')
const loadFonts = require('@nearform/clinic-common/behaviours/font-loader')

// Create spinner
const fontSpinner = spinner.attachTo(document.querySelector('main'))
// Create UI
const ui = new Ui('main')

// Called on font load or timeout
const drawUi = () => {
  fontSpinner.hide()
  document.body.classList.remove('is-loading-font')

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

// Show spinner
fontSpinner.show()
// Attach ask tray behaviours
askBehaviours()

// Orchestrate font loading
loadFonts({
  criticalFonts: ['Archia:n4'],
  onLoad: drawUi,
  onTimeout: drawUi,
  onLoadAfterTimeout: () => ui.emit('uiFontLoaded')
})

if (process.env.DEBUG_MODE) {
  window.ui = ui
}
