'use strict'

const htmlContentTypes = require('./html-content-types.js')
const debounce = require('lodash.debounce')

class Ui {
  constructor (wrapperSelector) {
    // TODO: Similar to 0x but condense hidden state like an octal
    // not json as number of excludables varies between samples
    // this.hashHistory = new HashHistory()

    this.dataTree = null
    this.exclude = new Set(['cpp', 'regexp', 'v8', 'native', 'init'])

    this.wrapperSelector = wrapperSelector
    this.sections = new Map()
    this.createContent()
  }

  createContent () {
    this.mainElement = document.querySelector(this.wrapperSelector)

    this.uiContainer = new htmlContentTypes.HtmlContent(null, {
      element: this.mainElement,
      id: 'one-col-layout'
    }, this, this.wrapperSelector)

    const toolbarOuter = this.uiContainer.addContent(undefined, {
      id: 'toolbar-outer',
      htmlElementType: 'section'
      // TODO: will probably need to make this collapsible for portrait view
    })
    // TODO: add these ↴
    // toolbarOuter.addContent('StackedBar')

    const toolbar = toolbarOuter.addContent('Toolbar', {
      id: 'toolbar'
    })

    const toolbarSidePanel = toolbar.addContent(undefined, {
      id: 'toolbar-side-panel',
      classNames: 'toolbar-section'
    })
    toolbarSidePanel.addContent('AreaKey')
    // TODO: add these ↴
    // toolbarSidePanel.addContent('SearchBox')
    // toolbarSidePanel.addContent('OptionsMenu')

    const flameWrapper = this.uiContainer.addContent('FlameGraph', {
      id: 'flame-main',
      classNames: 'scroll-container',
      htmlElementType: 'section'
    })
    // TODO: add these ↴
    // flameWrapper.addContent('FlameGraph', { id: 'flame-zoomed' })
    // flameWrapper.addContent('HoverBox')
    // flameWrapper.addContent('IndicatorArrow')

    this.uiContainer.addContent(undefined, {
      id: 'footer',
      htmlElementType: 'section'
    })
    // TODO: add these ↴
    // footer.addContent('FlameGraph', { id: 'flame-chronological' })
    // footer.addContent('TimeFilter')

    let scrollElement = null
    const scrollChartIntoView = debounce(() => {
      if (!scrollElement) {
        scrollElement = flameWrapper.d3Element.node()
      }
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth'
      })
    }, 200)

    window.addEventListener('resize', () => {
      flameWrapper.resize()
      scrollChartIntoView()
    })

    window.addEventListener('load', scrollChartIntoView)
  }

  addSection (id, options = {}) {
    options.id = id
    const section = this.uiContainer.addContent('HtmlContent', options)
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
    this.uiContainer.initializeElements()
  }

  draw () {
    // Cascades down tree in addContent() append/prepend order
    this.uiContainer.draw()
  }
}

module.exports = Ui
