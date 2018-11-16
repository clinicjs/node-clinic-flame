'use strict'

const events = require('events')
const htmlContentTypes = require('./html-content-types.js')
const debounce = require('lodash.debounce')
const DataTree = require('./data-tree.js')
const History = require('./history.js')

const TooltipHtmlContent = require('./flame-graph-tooltip-content')

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
    this.searchQuery = null
    this.presentationMode = process.env.PRESENTATION_MODE === 'true'

    this.tooltipHtmlContent = new TooltipHtmlContent(this)

    this.wrapperSelector = wrapperSelector
    this.exposedCSS = null
    this.setExposedCSS()

    this.sections = new Map()
    this.createContent()

    this.history.on('change', (data) => {
      this.updateFromHistory(data)
    })
  }

  pushHistory (opts = {}) {
    this.history.push({
      selectedNodeId: this.selectedNode && this.selectedNode.id,
      zoomedNodeId: this.zoomedNode && this.zoomedNode.id,
      useMerged: this.dataTree.useMerged,
      showOptimizationStatus: this.dataTree.showOptimizationStatus,
      exclude: this.dataTree.exclude,
      search: this.searchQuery
    }, opts)
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

    if (data.search !== this.searchQuery) {
      this.search(data.search, { pushState: false })
    }

    if (data.search !== this.searchQuery) {
      this.search(data.search, { pushState: false })
    }
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

    this.scrollSelectedFrameIntoView()

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
    this.scrollSelectedFrameIntoView()
  }

  clearSearch ({ pushState = true } = {}) {
    this.searchQuery = null
    this.emit('clearSearch')

    if (pushState) {
      this.pushHistory()
    }
  }

  search (query, { pushState = true } = {}) {
    if (!query) {
      if (this.searchQuery) this.clearSearch({ pushState })
      return
    }

    this.emit('search', query)

    const prevQuery = this.searchQuery
    this.searchQuery = query

    if (pushState) {
      this.pushHistory({
        // If the new query is just the old one with more characters,
        // the user was probably still typing. instead of pushing a new entry,
        // potentially resulting in many entries for a single query, replace the previous entry.
        replace: prevQuery && query.startsWith(prevQuery)
      })
    }
  }

  setPresentationMode (mode) {
    this.presentationMode = mode
    // switching the class on the html element
    document.documentElement.classList.toggle('presentation-mode', mode)
    this.setExposedCSS()
    this.emit('presentationMode', mode)
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
      id: 'stack-bar',
      tooltip,
      tooltipHtmlContent: this.tooltipHtmlContent
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

    const getZoomFactor = () => {
      // getting the zoomFactor when the viewport is larger than 600px
      // and as long as the width / height proportion equals to 16/9
      const minWidth = 600

      if (window.innerWidth > minWidth) {
        const size = Math.min(window.innerWidth, window.innerHeight * 16 / 9)
        const baseFactor = (size - minWidth) / 250
        const bonus = this.presentationMode ? 1.5 : 1
        return Math.round(baseFactor * bonus)
      }

      return 0
    }

    const flameWrapper = this.uiContainer.addContent('FlameGraph', {
      id: 'flame-main',
      htmlElementType: 'section',
      customTooltip: tooltip,
      zoomFactor: getZoomFactor(),
      tooltipHtmlContent: this.tooltipHtmlContent
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

    let scrollContainer = null
    this.scrollSelectedFrameIntoView = debounce(() => {
      if (!scrollContainer) {
        scrollContainer = flameWrapper.d3Element.select('.scroll-container').node()
      }

      let scrollAmount = scrollContainer.scrollHeight
      if (this.selectedNode) {
        const viewportHeight = scrollContainer.clientHeight
        const rect = this.flameWrapper.getNodeRect(this.selectedNode)

        scrollAmount = rect.y - viewportHeight * 0.4
        // scrolling only if the frame is outside the viewport
        if ((rect.y - rect.height) > scrollContainer.scrollTop && rect.y < scrollContainer.scrollTop + viewportHeight) return
      }

      if (scrollContainer.scrollTo) {
        scrollContainer.scrollTo({
          top: scrollAmount,
          behavior: 'smooth'
        })
      } else {
        // Fallback for MS Edge
        scrollContainer.scrollTop = scrollAmount
      }
    }, 200)

    const setFontSize = (zoomFactor) => {
      // increasing the font-size as the screen gets wider...
      document.documentElement.style.fontSize = 0.625 + zoomFactor / 16 + 'em'
    }

    setFontSize(getZoomFactor())
    // flameWrapper.

    window.addEventListener('resize', () => {
      const zoomFactor = getZoomFactor()
      flameWrapper.resize(zoomFactor)
      this.scrollSelectedFrameIntoView()
      reDrawStackBar()
      setFontSize(zoomFactor)
    })

    window.addEventListener('load', this.scrollSelectedFrameIntoView)

    this.on('presentationMode', () => {
      const zoomFactor = getZoomFactor()
      flameWrapper.resize(zoomFactor)
      setFontSize(zoomFactor)
      this.scrollSelectedFrameIntoView()
    })
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
      'deps': singular ? 'Dependency' : 'Dependencies',
      'all-core': 'Core',

      'core': 'Node JS',
      'native': 'V8 native',
      'v8': 'V8 runtime',
      'cpp': 'V8 C++',
      'regexp': 'RegExp',
      'init': 'Init'
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
      'all-core': computedStyle.getPropertyValue('--area-color-core').trim(),

      'opposite-contrast': computedStyle.getPropertyValue('--opposite-contrast').trim(),
      'max-contrast': computedStyle.getPropertyValue('--max-contrast').trim(),
      'grey-blue': computedStyle.getPropertyValue('--grey-blue').trim(),
      'primary-grey': computedStyle.getPropertyValue('--primary-grey').trim()
    }
  }

  getFrameColor (nodeData, role, reverse = nodeData.highlight) {
    if ((role === 'background' && !reverse) || (role === 'foreground' && reverse)) {
      return this.exposedCSS['opposite-contrast']
    }

    if (this.dataTree.showOptimizationStatus) {
      if (nodeData.isOptimisable) return this.exposedCSS['max-contrast']
      if (nodeData.isOptimised) return this.exposedCSS['primary-grey']
      return this.exposedCSS['grey-blue']
    } else {
      return this.exposedCSS[nodeData.category]
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

    // setting Presentation Mode
    this.setPresentationMode(this.presentationMode)
  }
}

module.exports = Ui
