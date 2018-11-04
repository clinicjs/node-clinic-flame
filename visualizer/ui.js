'use strict'

const events = require('events')
const htmlContentTypes = require('./html-content-types.js')
const debounce = require('lodash.debounce')
const DataTree = require('./data-tree.js')
const History = require('./history.js')

class Ui extends events.EventEmitter {
  constructor (wrapperSelector) {
    super()

    this.history = new History()

    this.dataTree = null
    this.highlightedNode = null
    this.selectedNode = null
    this.zoomedNode = null
    this.changedExclusions = {
      toHide: new Set(),
      toShow: new Set()
    }

    this.wrapperSelector = wrapperSelector
    this.exposedCSS = null
    this.setExposedCSS()

    this.sections = new Map()
    this.createContent()

    this.history.on('change', (data) => {
      this.updateFromHistory(data)
    })
  }

  pushHistory () {
    this.history.push({
      selectedNodeId: this.selectedNode && this.selectedNode.id,
      zoomedNodeId: this.zoomedNode && this.zoomedNode.id,
      useMerged: this.dataTree.useMerged,
      showOptimizationStatus: this.dataTree.showOptimizationStatus,
      exclude: this.dataTree.exclude
    })
  }

  updateFromHistory (data) {
    this.dataTree.useMerged = data.useMerged
    this.dataTree.showOptimizationStatus = data.showOptimizationStatus

    let anyChanges = false

    // Diff exclusion setting so FlameGraph can update.
    data.exclude.forEach((name) => {
      if (this.dataTree.exclude.has(name)) return
      this.changedExclusions.toHide.add(name)
      anyChanges = true
    })
    this.dataTree.exclude.forEach((name) => {
      if (data.exclude.has(name)) return
      this.changedExclusions.toShow.add(name)
      anyChanges = true
    })
    this.dataTree.exclude = data.exclude

    if (anyChanges) this.updateExclusions({ pushState: false })

    // Redraw before zooming to make sure these nodes are visible in the flame graph.
    this.draw()

    this.selectNode(this.dataTree.getNodeById(data.selectedNodeId), { pushState: false })
    this.zoomNode(this.dataTree.getNodeById(data.zoomedNodeId), { pushState: false })
  }

  // Temporary e.g. on mouseover, erased on mouseout
  highlightNode (node = null) {
    if (node && node.id === 0) return
    const changed = node !== this.highlightedNode
    this.highlightedNode = node
    if (changed) this.emit('highlightNode', node)

    this.showNodeInfo(node || this.selectedNode)
  }

  // Persistent e.g. on click, then falls back to this after mouseout
  selectNode (node = null, { pushState = true } = {}) {
    if (node && node.id === 0) return
    const changed = node !== this.selectedNode
    this.selectedNode = node
    if (changed) this.emit('selectNode', node)

    this.showNodeInfo(node)
    this.highlightNode(node)

    if (pushState) this.pushHistory()
  }

  selectHottestNode (opts) {
    this.selectNode(this.dataTree.getFrameByRank(0), opts)
  }

  zoomNode (node = null, { pushState = true } = {}) {
    if (!node && !this.zoomedNode) return

    // Zoom out if zooming in on already-zoomed node
    node = (!node || node === this.zoomedNode) ? null : node
    this.zoomedNode = node
    this.emit('zoomNode', node)
    if (node && node !== this.selectedNode) {
      this.selectNode(node, { pushState })
    } else if (pushState) {
      this.pushHistory()
    }
  }

  clearSearch () {
    this.flameWrapper.clearSearch()
  }

  search (query) {
    if (!query) return

    this.flameWrapper.search(query)
    // TODO add to hash URL
    // This may be called while the user is still typing; ideally we'd have a single history entry for a single query.
    // A way to approach that is to keep track of the prev value, and do
    // `query.startsWith(prevQuery)`
    // if that matches, use replaceState() instead of pushState().
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
      isHoverOverridden: true,
      id: 'ui-tooltip'
    })
    this.tooltip = tooltip

    const toolbar = this.uiContainer.addContent(undefined, {
      id: 'toolbar',
      htmlElementType: 'section'
    })

    this.stackBar = toolbar.addContent('StackBar', {
      id: 'stack-bar'
    })

    const toolbarTopPanel = toolbar.addContent(undefined, {
      id: 'toolbar-top-panel'
    })

    toolbarTopPanel.addContent('SelectionControls', {
      id: 'selection-controls',
      customTooltip: tooltip
    })

    this.infoBox = toolbar.addContent('InfoBox', {
      id: 'info-box',
      customTooltip: tooltip
    })

    const toolbarSidePanel = toolbarTopPanel.addContent(undefined, {
      id: 'toolbar-side-panel',
      classNames: 'toolbar-section'
    })
    toolbarSidePanel.addContent('SearchBox', {
      id: 'search-box',
      classNames: 'inline-panel'
    })
    toolbarSidePanel.addContent('OptionsMenu', {
      id: 'options-menu',
      classNames: 'inline-panel',
      customTooltip: tooltip
    })

    const flameWrapper = this.uiContainer.addContent('FlameGraph', {
      id: 'flame-main',
      htmlElementType: 'section',
      customTooltip: tooltip
    })
    this.flameWrapper = flameWrapper

    const footer = this.uiContainer.addContent(undefined, {
      id: 'footer',
      htmlElementType: 'section'
    })
    footer.addContent('Key', {
      id: 'key-panel',
      classNames: 'panel'
    })

    // TODO: add these ↴
    // footer.addContent('FlameGraph', { id: 'flame-chronological' })
    // footer.addContent('TimeFilter')

    let reDrawStackBar = debounce(() => this.stackBar.draw(this.highlightedNode), 200)

    let scrollElement = null
    const scrollChartIntoView = debounce(() => {
      if (!scrollElement) {
        scrollElement = flameWrapper.d3Element.select('.scroll-container').node()
      }

      if (scrollElement.scrollTo) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: 'smooth'
        })
      } else {
        // Fallback for MS Edge
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }, 200)

    const setFontSize = () => {
      // increasing the font-size as the screen gets wider...
      // as long as the width / height proportion equals to 16/9
      const minWidth = 600

      if (window.innerWidth > minWidth) {
        const size = Math.min(window.innerWidth, window.innerHeight * 16 / 9)
        document.documentElement.style.fontSize = 0.625 + (size - minWidth) / 250 / 16 + 'em'
      }
    }

    setFontSize()

    window.addEventListener('resize', () => {
      flameWrapper.resize()
      scrollChartIntoView()
      reDrawStackBar()
      setFontSize()
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

  setCodeAreaVisibility (name, visible, manyTimes) {
    // Apply a single possible change to dataTree.exclude, updating what's necessary
    let isChanged = false

    if (visible) {
      isChanged = this.dataTree.show(name)
      if (isChanged) this.changedExclusions.toShow.add(name)
    } else {
      isChanged = this.dataTree.hide(name)
      if (isChanged) this.changedExclusions.toHide.add(name)
    }

    if (isChanged && !manyTimes) this.updateExclusions()

    return isChanged
  }

  updateExclusions ({ initial, pushState = true } = {}) {
    this.dataTree.update(initial)

    if (this.selectedNode && this.dataTree.exclude.has(this.selectedNode.type)) {
      this.selectHottestNode()
    }

    if (!initial) this.emit('updateExclusions')
    if (pushState) {
      this.pushHistory()
    }
  }

  setUseMergedTree (useMerged) {
    if (this.dataTree.useMerged === useMerged) {
      return
    }

    this.dataTree.setActiveTree(useMerged)

    this.draw()
    this.selectHottestNode()

    this.pushHistory()
  }

  setShowOptimizationStatus (showOptimizationStatus) {
    this.dataTree.showOptimizationStatus = showOptimizationStatus
    this.draw()
    this.pushHistory()
  }

  setData (dataTree) {
    this.dataTree = new DataTree(dataTree)
    this.updateExclusions({ pushState: false, initial: true })
    this.emit('setData')
    this.history.setData(dataTree)
  }

  showNodeInfo (nodeData) {
    this.infoBox.showNodeInfo(nodeData)
  }

  /**
  * Initialization and draw
  **/

  setExposedCSS () {
    // TODO: When light / dark theme switch implemented, call this after each switch, before redraw
    const computedStyle = window.getComputedStyle(document.body)
    this.exposedCSS = {
      app: computedStyle.getPropertyValue('--area-color-app').trim(),
      deps: computedStyle.getPropertyValue('--area-color-deps').trim(),
      'all-core': computedStyle.getPropertyValue('--area-color-core').trim()
    }
  }

  initializeElements () {
    // Cascades down tree in addContent() append/prepend order
    this.uiContainer.initializeElements()
  }

  draw () {
    // Cascades down tree in addContent() append/prepend order
    this.uiContainer.draw()

    this.changedExclusions.toHide.clear()
    this.changedExclusions.toShow.clear()
  }
}

module.exports = Ui
