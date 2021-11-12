'use strict'

const d3 = require('./d3.js')
const events = require('events')
const htmlContentTypes = require('./html-content-types.js')
const debounce = require('lodash.debounce')
const DataTree = require('./data-tree.js')
const History = require('./history.js')
const spinner = require('@clinic/clinic-common/spinner')

const close = require('@clinic/clinic-common/icons/close')

const TooltipHtmlContent = require('./flame-graph-tooltip-content')
const getNoDataNode = require('./no-data-node.js')

const { button, walkthroughButton } = require('@clinic/clinic-common/base/index.js')
const wtSteps = require('./walkthrough-steps.js')

class Ui extends events.EventEmitter {
  constructor (wrapperSelector) {
    super()

    this.flameWrapperSpinner = null
    this.history = new History()

    this.dataTree = null
    this.highlightedNode = null

    this.selectedNode = getNoDataNode()

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
      walkthroughIndex: this.helpButton.WtPlayer.currentStepIndex
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
      walkthroughIndex
    } = data

    this.setUseMergedTree(useMerged, {
      pushState: false,
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
      }
    })

    if (search !== this.searchQuery) {
      this.search(search, { pushState: false })
    }
    if (walkthroughIndex !== undefined) {
      this.helpButton.WtPlayer.skipTo(walkthroughIndex)
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
    if (!node || node.id === 0 || this.dataTree.isNodeExcluded(node)) {
      if (!this.selectedNode) this.selectHottestNode({ pushState })
      return
    }
    if (!node || node.id === 0) return
    const changed = node !== this.selectedNode
    this.selectedNode = node
    if (changed) this.emit('selectNode', node)

    this.scrollSelectedFrameIntoView()

    this.showNodeInfo(node)
    this.highlightNode(node)

    if (pushState) this.pushHistory()
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

    this.mainContent = this.uiContainer.addContent('HtmlContent', {
      id: 'main-content'
    })

    const flameWrapper = this.mainContent.addContent('FlameGraph', {
      id: 'flame-main',
      htmlElementType: 'section',
      customTooltip: tooltip,
      zoomFactor: getZoomFactor(),
      tooltipHtmlContent: this.tooltipHtmlContent
    })
    this.flameWrapper = flameWrapper

    this.sideBar = this.mainContent.addContent('SideBar', {
      id: 'side-bar',
      animationEnd: () => {
        const zoomFactor = getZoomFactor()
        flameWrapper.resize(zoomFactor)
      }
    })

    this.sideBar.addContent('FiltersContent', {
      classNames: 'filters-options',
      getSpinner: () => this.flameWrapperSpinner
    })

    this.footer = this.uiContainer.addContent(undefined, {
      id: 'footer',
      htmlElementType: 'section'
    })

    // mobile search-box
    this.mSearchBoxWrapper = this.footer.addContent(undefined, {
      id: 'm-search-box-wrapper',
      classNames: 'before-bp-2 m-search-box-wrapper'
    })
    this.mSearchBoxWrapper.addContent('SearchBox', {
      id: 'm-search-box',
      classNames: 'inline-panel'
    })

    this.footer.addContent('FiltersContainer', {
      id: 'filters-bar',
      toggleSideBar: this.toggleSideBar,
      getSpinner: () => this.flameWrapperSpinner
    })

    // TODO: add these ↴
    // footer.addContent('FlameGraph', { id: 'flame-chronological' })
    // footer.addContent('TimeFilter')

    const reDrawStackBar = debounce(() => this.stackBar.draw(this.highlightedNode), 200)

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
      app: this.dataTree.appName || 'profiled application',
      deps: singular ? 'Dependency' : 'Dependencies',
      core: 'Node JS',
      wasm: 'WebAssembly',

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
      app: '<span>Functions in the code of the application being profiled.</span>',
      deps: '<span>External modules in the application\'s node_modules directory.</span>',
      core: '<span>JS functions in core Node.js APIs.</span>',
      wasm: '<span>Compiled WebAssembly code.</span>',
      'all-v8': `<span>The JavaScript engine used by default in Node.js.</span> ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-v8')}`,
      'all-v8:v8': `<span>Operations in V8's implementation of JS.</span> ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-v8-runtime')}`,
      'all-v8:native': `<span>JS compiled into V8, such as prototype methods and eval.</span> ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-v8-native')}`,
      'all-v8:cpp': `<span>Native C++ operations called by V8, including shared libraries.</span> ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-v8-cpp')}`,
      'all-v8:regexp': `<span>The RegExp notation is shown as the function name.</span> ${this.createMoreInfoLink('https://clinicjs.org/documentation/flame/09-advanced-controls/#controls-regexp')}`
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

  setCodeAreaVisibility ({ codeArea, visible, pushState = true, isRecursing = false }) {
    // Apply a single possible change to dataTree.exclude, updating what's necessary
    let isChanged = false

    if (codeArea.children && codeArea.children.length) {
      const childrenChanged = codeArea.children.forEach(child => this.setCodeAreaVisibility({
        codeArea: child,
        visible,
        pushState: false,
        isRecursing: true
      }))
      this.updateExclusions({ pushState })
      return childrenChanged
    } else {
      const name = codeArea.excludeKey
      if (visible) {
        isChanged = this.dataTree.show(name)
        if (isChanged) this.changedExclusions.toShow.add(name)
      } else {
        isChanged = this.dataTree.hide(name)
        if (isChanged) this.changedExclusions.toHide.add(name)
      }

      if (isChanged && !isRecursing) this.updateExclusions({ pushState })
    }

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
      if (pushState) this.pushHistory()
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

    this.zoomNode(null, {
      cb: () => {
      // Complete update after any zoom animation is complete
        this.dataTree.setActiveTree(useMerged)

        this.draw()
        if (!selectedNodeId) this.selectHottestNode()

        if (pushState) this.pushHistory()

        if (cb) cb()

        this.emit('updateExclusions')
      }
    })
  }

  setShowOptimizationStatus (showOptimizationStatus) {
    this.dataTree.showOptimizationStatus = showOptimizationStatus
    this.draw()
    this.pushHistory()
    this.emit('updateExclusions')
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

  toggleMobileSearchBox (show = !this.mSearchBoxWrapper.d3Element.classed('show')) {
    clearTimeout(this.mSearchBoxAutoHideHnd)
    this.mSearchBoxWrapper.d3Element.classed('show', show)
    if (show) this.mSearchBoxWrapper.d3Element.select('input').node().focus()
  }

  toggleSideBar (show = !this.sideBar.d3Element.classed('expand')) {
    this.sideBar.toggle(show)
    this.emit('sideBar', show)
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
      core: computedStyle.getPropertyValue('--area-color-core').trim(),
      wasm: computedStyle.getPropertyValue('--area-color-core').trim(),
      'all-v8': computedStyle.getPropertyValue('--area-color-core').trim(),

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

    // auto hiding mobile search-box on blur if empty
    this.mSearchBoxWrapper.d3Element.select('input')
      .on('blur', (datum, index, nodes) => {
        this.mSearchBoxAutoHideHnd = setTimeout(() => {
          // this little delay is to avoid clashes between the 'blur' cb and clicking on the search button
          if (nodes[index].value.trim() === '') {
            this.toggleMobileSearchBox(false)
          }
        }, 300)
      })

    // adding the mSearchBox close button
    this.mSearchBoxWrapper.d3Element.append(() => button({
      leftIcon: close,
      onClick: () => {
        clearTimeout(this.mSearchBoxAutoHideHnd)
        if (this.searchQuery === null) {
          // close if empty
          this.toggleMobileSearchBox(false)
        } else {
          // clear otherwise
          this.clearSearch()
        }
      }
    }))

    // walkthrough init
    this.helpButton = walkthroughButton({
      steps: wtSteps,
      onProgress: () => {
        this.pushHistory()
      },
      label: '<span class="before-bp-1">Guide</span><span class="after-bp-1">Show how to use this</span>',
      title: 'Click to start the step-by-step UI features guide!'
    })
    // Place help button top right
    d3.select('.nc-header__inner').append(() => this.helpButton.button)

    this.flameWrapperSpinner = spinner.attachTo(document.querySelector('#flame-main'))
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
