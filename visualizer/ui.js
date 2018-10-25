'use strict'

const events = require('events')
const htmlContentTypes = require('./html-content-types.js')
const debounce = require('lodash.debounce')
const DataTree = require('./data-tree.js')

class Ui extends events.EventEmitter {
  constructor (wrapperSelector) {
    super()
    // TODO: Similar to 0x but condense hidden state like an octal
    // not json as number of excludables varies between samples
    // this.hashHistory = new HashHistory()

    this.dataTree = null
    this.highlightedNode = null
    this.selectedNode = null
    this.zoomedNode = null

    this.wrapperSelector = wrapperSelector
    this.sections = new Map()
    this.createContent()
  }

  /**
  * Handling user interactions
  **/

  highlightNode (node = null) {
    const changed = node !== this.highlightedNode
    this.highlightedNode = node
    if (changed) this.emit('highlightNode', node || this.selectedNode)
  }

  selectNode (node = null) {
    const changed = node !== this.selectedNode
    this.selectedNode = node
    if (changed) this.emit('selectNode', node)
    if (!this.highlightedNode) this.emit('highlightNode', node)
  }

  zoomNode (node = this.highlightedNode) {
    const zoomingOut = !node || node === this.zoomedNode
    this.emit('zoomNode', zoomingOut ? null : node)
  }

  clearSearch () {
    const flameWrapper = this.uiContainer.content.get('flame-main')
    flameWrapper.clearSearch()
  }

  search (query) {
    if (!query) return

    const flameWrapper = this.uiContainer.content.get('flame-main')
    flameWrapper.search(query)
  }

  /**
  * Sections and content
  **/

  createContent () {
    this.mainElement = document.querySelector(this.wrapperSelector)

    this.uiContainer = new htmlContentTypes.HtmlContent(null, {
      element: this.mainElement,
      id: 'one-col-layout'
    }, this, this.wrapperSelector)

    // creating the tooltip instance that the Ui's components can share
    const tooltip = this.uiContainer.addContent('Tooltip', {
      htmlElementType: 'div',
      id: 'ui-tooltip'
    })
    this.tooltip = tooltip

    const toolbarOuter = this.uiContainer.addContent(undefined, {
      id: 'toolbar-outer',
      htmlElementType: 'section'
      // TODO: will probably need to make this collapsible for portrait view
    })
    // TODO: add these ↴
    toolbarOuter.addContent('StackBar', {
      id: 'stack-bar'
    })

    const toolbar = toolbarOuter.addContent('Toolbar', {
      id: 'toolbar',
      customTooltip: tooltip
    })

    const toolbarSidePanel = toolbar.addContent(undefined, {
      id: 'toolbar-side-panel',
      classNames: 'toolbar-section'
    })
    toolbarSidePanel.addContent('AreaKey', {
      id: 'area-key',
      classNames: 'panel'
    })
    toolbarSidePanel.addContent('SearchBox', {
      id: 'search-box',
      classNames: 'inline-panel'
    })
    toolbarSidePanel.addContent('OptionsMenu', {
      id: 'options-menu',
      classNames: 'inline-panel'
    })

    const flameWrapper = this.uiContainer.addContent('FlameGraph', {
      id: 'flame-main',
      classNames: 'scroll-container',
      htmlElementType: 'section',
      customTooltip: tooltip
    })
    this.flameWrapper = flameWrapper

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

  getLabelFromKey (key, singular = false) {
    const keysToLabels = {
      'app': 'profiled application',
      'deps': singular ? 'dependency' : 'dependencies',
      'all-core': 'core',

      'core': 'Node JS',
      'native': 'V8 native JS',
      'v8': 'V8 runtime',
      'cpp': 'V8 C++',
      'regexp': 'RegExp',
      'init': 'initialization'
    }
    return keysToLabels[key] || key
  }

  /**
  * Initialization and draw
  **/

  initializeElements () {
    // Cascades down tree in addContent() append/prepend order
    this.uiContainer.initializeElements()

    // hiding the tooltip on scroll
    this.flameWrapper.d3Element.node().addEventListener('scroll', () => this.tooltip.hide({ delay: 0 }))
    window.addEventListener('scroll', () => this.tooltip.hide({ delay: 0 }))
  }

  setData (dataTree) {
    this.dataTree = new DataTree(dataTree)
    this.draw()
  }

  draw () {
    // Cascades down tree in addContent() append/prepend order
    this.uiContainer.draw()
  }
}

module.exports = Ui
