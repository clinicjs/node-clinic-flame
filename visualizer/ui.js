'use strict'

const htmlContentTypes = require('./html-content-types.js')

class Ui {
  constructor () {
    // TODO: Similar to 0x but condense hidden state like an octal
    // not json as number of excludables varies between samples
    // this.hashHistory = new HashHistory()

    this.dataTree = null
    this.exclude = new Set(['cpp', 'regexp', 'v8', 'native', 'init'])

    this.sections = new Map()
    this.createContent()
  }

  createContent () {
    this.mainContainer = new htmlContentTypes.HtmlContent(null, {
      htmlElementType: 'main'
    }, this)

    const flameWrapper = this.addSection('flame-wrapper')
    flameWrapper.addContent('FlameGraph', { id: 'flame-main' })

    // TODO: add these ↴
    // flameWrapper.addContent('FlameGraph', { id: 'flame-zoomed' })
    // flameWrapper.addContent('HoverBox')
    // flameWrapper.addContent('IndicatorArrow')

    // TODO: add these ↴
    // const topPanel = this.addSection('top-panel')
    // topPanel.addContent('StackedBar')
    // topPanel.addContent('FrameInfo')
    // topPanel.addContent('OptionsMenu')

    // TODO: add these ↴
    // const chronologyPanel = this.addSection('chronology-panel')
    // chronologyPanel.addContent('FlameGraph', { id: 'flame-chronological' })
    // chronologyPanel.addContent('TimeFilter')
  }

  addSection (id, options = {}) {
    options.id = id
    const section = this.mainContainer.addContent('HtmlContent', options)
    section.ui = this
    this.sections.set(id, section)
    return section
  }

  getContentClass (className) {
    const ContentClass = htmlContentTypes[className]
    if (typeof ContentClass !== 'function') {
      throw new Error(`HTML content class "${className}" is ${typeof ContentClass}`)
    }

    return ContentClass
  }

  setData (dataTree) {
    const previousDataTree = this.dataTree
    this.dataTree = dataTree
    if (dataTree !== previousDataTree) {
      this.draw()
    }
  }

  initializeElements () {
    // Cascades down tree in addContent() append/prepend order
    this.mainContainer.initializeElements()
  }

  draw () {
    // Cascades down tree in addContent() append/prepend order
    this.mainContainer.draw()
  }
}

module.exports = Ui
