'use strict'

const events = require('events')
const htmlContentTypes = require('./html-content-types.js')
const debounce = require('lodash.debounce')
const DataTree = require('./data-tree.js')
const History = require('./history.js')

const TooltipHtmlContent = require('./flame-graph-tooltip-content')
const getNoDataNode = require('./no-data-node.js')

class Ui extends events.EventEmitter {
  constructor (wrapperSelector) {
    super()

    this.history = new History()

    this.dataTree = null
    this.highlightedNode = null

    this.showOccurrences = false

    this.selectedNode = getNoDataNode()
    this.selectedNodeOtherOccurrences = []

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
      search: this.searchQuery,
      showOccurrences: this.showOccurrences
    }, opts)
  }

  updateFromHistory (data) {
    const {
      exclude,
      useMerged,
      search,
      selectedNodeId,
      showOptimizationStatus,
      zoomedNodeId,
      showOccurrences
    } = data

    this.dataTree.showOccurrences = showOccurrences
    this.setOccurrencesVisibility(showOccurrences, { pushState: false })

    this.setUseMergedTree(useMerged, { pushState: false,
      selectedNodeId,
      cb: () => {
        this.dataTree.showOptimizationStatus = showOptimizationStatus

        let anyChanges = false

        // Diff exclusion setting so FlameGraph can update.
        exclude.forEach((name) => {
          if (this.dataTree.exclude.has(name)) return
          this.changedExclusions.toHide.add(name)
          anyChanges = true
        })
        this.dataTree.exclude.forEach((name) => {
          if (exclude.has(name)) return
          this.changedExclusions.toShow.add(name)
          anyChanges = true
        })
        this.dataTree.exclude = exclude

        if (anyChanges) this.updateExclusions({ pushState: false, selectedNodeId, zoomedNodeId })

        // Redraw before zooming to make sure these nodes are visible in the flame graph.
        this.draw()

        this.zoomNode(this.dataTree.getNodeById(zoomedNodeId), { pushState: false })
        this.selectNode(this.dataTree.getNodeById(selectedNodeId), { pushState: false })

        if (search !== this.searchQuery) {
          this.search(search, { pushState: false })
        }
      } })
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
    if (!node || node.id === 0 || this.dataTree.isNodeExcluded(node)) {
      if (!this.selectedNode) this.selectHottestNode({ pushState })
      return
    }
    if (!node || node.id === 0) return
    const changed = node !== this.selectedNode
    this.selectedNode = node
    this.selectedNodeOtherOccurrences = this.selectOtherOccurrences(node)

    if (changed) this.emit('selectNode', node)

    this.scrollSelectedFrameIntoView()

    this.showNodeInfo(node)
    this.highlightNode(node)

    if (pushState) this.pushHistory()
  }

  selectOtherOccurrences (node) {
    return node ? this.dataTree.activeNodes().filter(n => {
      n.isOtherOccurrence = n.name === node.name && n.id !== node.id
      return (n.name === node.name && n.id !== node.id)
    }) : []
  }

  selectHottestNode (opts) {
    const node = this.dataTree.getFrameByRank(0)
    if (!node) return getNoDataNode()

    // Prevent infinite loop if some future bug allows an invalid node to be returned here
    const nodeInvalidMessage = ' node selected in selectHottestNode'
    if (node.id === 0) throw new Error('Root' + nodeInvalidMessage)
    if (this.dataTree.isNodeExcluded(node)) throw new Error('Excluded' + nodeInvalidMessage)

    this.selectNode(node, opts)
  }

  zoomNode (node = null, { pushState = true, cb } = {}) {
    if (!node && !this.zoomedNode) {
      if (cb) cb()
      return
    }

    // Zoom out if zooming in on already-zoomed node, or zoom target is excluded
    if (!node || node === this.zoomedNode || this.dataTree.isNodeExcluded(node)) node = null
    this.zoomedNode = node

    this.emit('zoomNode', node, cb)
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

  setOccurrencesVisibility (isVisible, { pushState = true } = {}) {
    this.dataTree.showOccurrences = isVisible
    this.showOccurrences = isVisible
    if (pushState) {
      this.pushHistory()
    }
    this.emit('showOccurrences', isVisible)
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
      if (this.selectedNode && this.selectedNode.category !== 'none') {
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
      'core': 'Node JS',

      'is:inlinable': 'Inlinable',
      'is:init': 'Init',

      'all-v8': 'V8',
      'all-v8:native': 'V8 native',
      'all-v8:v8': 'V8 runtime',
      'all-v8:cpp': 'V8 C++',
      'all-v8:regexp': 'RegExp'
    }

    if (keysToLabels[key]) {
      return keysToLabels[key]
    }

    const splitKey = key.split(':')
    if (splitKey.length > 1) {
      const type = splitKey[1]
      return keysToLabels[type] || type
    }

    return key
  }

  getDescriptionFromKey (key) {
    const keysToDescriptions = {
      'core': `JS functions in core Node.js APIs.`,
      'all-v8': `The JavaScript engine used by default in Node.js. ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-v8')}`,
      'all-v8:v8': `Operations in V8's implementation of JS. ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-v8-runtime')}`,
      'all-v8:native': `JS compiled into V8, such as prototype methods and eval. ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-v8-native')}`,
      'all-v8:cpp': `Native C++ operations called by V8, including shared libraries. ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-v8-cpp')}`,
      'all-v8:regexp': `The RegExp notation is shown as the function name. ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-regexp')}`
    }

    if (keysToDescriptions[key]) {
      return keysToDescriptions[key]
    }

    if (key.startsWith('deps:')) {
      // TODO use actual path, this is incorrect for
      // nested dependencies
      return `./node_modules/${key.slice(5)}`
    }

    return null
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

  updateExclusions ({ initial, pushState = true, selectedNodeId, zoomedNodeId } = {}) {
    this.dataTree.update(initial)

    const selectedNodeNotShown = this.selectedNode && (this.dataTree.isNodeExcluded(this.selectedNode) || this.selectedNode.category === 'none')

    if (!initial && !selectedNodeId && selectedNodeNotShown) {
      this.selectHottestNode()
    }

    const cb = () => {
      if (!initial) this.emit('updateExclusions')
      if (pushState) {
        this.pushHistory()
      }
    }

    // Zoom out before updating exclusions if the user excludes the node they're zoomed in on
    if (!zoomedNodeId && this.zoomedNode && this.dataTree.isNodeExcluded(this.zoomedNode)) {
      this.zoomNode(null, { cb })
    } else {
      cb()
    }
  }

  setUseMergedTree (useMerged, { pushState = true, selectedNodeId, cb } = {}) {
    if (this.dataTree.useMerged === useMerged) {
      if (cb) cb()
      return
    }

    // Current selected and zoomed nodes will be in wrong tree, therefore may cause errors during draw.
    // ui.selectNode() will be called properly in this.selectHottestNode() or based on selectedNodeId.
    this.selectedNode = null

    this.zoomNode(null, { cb: () => {
      // Complete update after any zoom animation is complete
      this.dataTree.setActiveTree(useMerged)

      this.draw()
      if (!selectedNodeId) this.selectHottestNode()

      if (pushState) this.pushHistory()

      if (cb) cb()
    } })
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
      'core': computedStyle.getPropertyValue('--area-color-core').trim(),
      'all-v8': computedStyle.getPropertyValue('--area-color-core').trim(),

      'opposite-contrast': computedStyle.getPropertyValue('--opposite-contrast').trim(),
      'max-contrast': computedStyle.getPropertyValue('--max-contrast').trim(),
      'grey-blue': computedStyle.getPropertyValue('--grey-blue').trim(),
      'primary-grey': computedStyle.getPropertyValue('--primary-grey').trim(),
      'occurrences-border': computedStyle.getPropertyValue('--occurrences-border').trim()
    }
  }

  getFrameColor (nodeData, role, reverse = nodeData.highlight) {
    if (role === 'border' && this.showOccurrences) {
      if (nodeData.isOtherOccurrence) {
        return this.exposedCSS['occurrences-border']
      }
    }
    if ((role === 'background' && !reverse) || (role === 'foreground' && reverse)) {
      return this.exposedCSS['opposite-contrast']
    }

    if (this.dataTree.showOptimizationStatus) {
      if (nodeData.isUnoptimized) return this.exposedCSS['max-contrast']
      if (nodeData.isOptimized) return this.exposedCSS['primary-grey']
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

  createMoreInfoLink (href) {
    return `
      <a target="_blank" rel="noopener noreferrer" href="${href}" class="more-info">
        More info
      </a>
    `
  }
}

module.exports = Ui
