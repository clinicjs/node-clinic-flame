'use strict'

// d3-fg is likely a temporary dep, most layout logic will move to analysis and
// most draw / interactivity logic will be replaced here
const d3Fg = require('d3-fg')
const flameGradient = require('flame-gradient')
const HtmlContent = require('./html-content.js')

const FgTooltipContainer = require('./flame-graph-tooltip-container')
const Message = require('./message.js')
const copy = require('copy-to-clipboard')
const getLabelRenderer = require('./flame-graph-label.js')

const searchHighlightColor = 'orange'

class FlameGraph extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    const defaults = {
      showOptimizationStatus: false,
      labelFont: 'Verdana, sans-serif',
      labelPadding: 3
    }
    contentProperties = Object.assign({}, defaults, contentProperties)
    super(parentContent, contentProperties)

    this.hoveredNodeData = null
    this.changedWidth = false

    this.tooltip = contentProperties.customTooltip
    this.showOptimizationStatus = contentProperties.showOptimizationStatus

    this.labelFont = contentProperties.labelFont
    this.labelPadding = contentProperties.labelPadding

    this.ui.on('setData', () => {
      this.initializeFromData()
    })

    this.ui.on('zoomNode', node => {
      if (this.flameGraph) {
        this.zoomedNodeData = node

        // Hide tooltip and highlight box / pointer until .on('animationEnd')
        this.tooltip.hide()
        this.hoveredNodeData = null
        this.highlightHoveredNodeOnGraph()
        this.markNodeAsSelected(null)
        this.markNodeAsZoomed(null)
        this.flameGraph.zoom(node || this.ui.dataTree.activeTree())
      }
    })
  }

  initializeElements () {
    super.initializeElements()
    this.d3Chart = this.d3Element.append('chart')
      .classed('flamegraph-outer', true)
      .classed('scroll-container', true)
      .style('position', 'relative')

    // creating the component to highlight the hovered node on the flame graph
    this.d3Highlighter = this.d3Element.append('div')
      .classed('node-highlighter', true)
    this.d3HighlighterDownArrow = this.d3Highlighter.append('div')
      .classed('down-arrow', true)
    this.d3HighlighterVerticalLine = this.d3Highlighter.append('div')
      .classed('vertical-line', true)
    this.d3HighlighterBox = this.d3Element.append('div')
      .classed('highlighter-box', true)

    this.d3SelectionMarker = this.d3Element.append('div')
      .classed('selection-box', true)

    this.d3ZoomMarker = this.d3Element.append('div')
      .classed('zoom-underline', true)
      .classed('hidden', true)

    if (this.tooltip) {
      this.tooltip = new FgTooltipContainer({
        tooltip: this.tooltip,
        onCopyPath: (path) => {
          Message.info(`
              <span>Path copied to the clipboard!</span>
              <pre>${path}</pre>
            `, 4000)
          copy(path)
        }
      })
    }

    // listening for `highlightNode` event
    this.ui.on('highlightNode', node => {
      this.hoveredNodeData = node || this.ui.selectedNode
      this.highlightHoveredNodeOnGraph()
    })

    this.ui.on('selectNode', node => {
      this.hoveredNodeData = node
      this.highlightHoveredNodeOnGraph()

      this.markNodeAsSelected(node)
    })

    this.ui.on('option.merge', (checked) => {
      this.draw()
      this.highlightHoveredNodeOnGraph()
    })

    // hiding the tooltip on scroll and moving the box
    this.d3Chart.node().addEventListener('scroll', () => {
      this.tooltip.hide({ delay: 0 })
      this.updateMarkerBoxes()
    })
  }

  initializeFromData () {
    this.renderedTree = this.getTree()

    // TODO rather than calculating this single value here, we should be walking through
    // all the nodes and sorting high stackTop values, so we can
    // 1) display a heat key at the top;
    // 2) pick the highest value from that list for use here.
    const dataTree = this.ui.dataTree
    const highest = dataTree.getHighestStackTop()

    const sorter = dataTree.getFilteredStackSorter()

    this.prevExclude = new Set(this.ui.dataTree.exclude)
    this.flameGraph = d3Fg({
      tree: dataTree.unmerged,
      exclude: dataTree.exclude,
      element: this.d3Chart.node(),
      cellHeight: 20,
      collapseHiddenNodeWidths: true,
      heatBars: true,
      minHeight: window.screen.availHeight,
      frameColors: {
        fill: '#000',
        stroke: '#363b4c'
      },
      // We already categorized nodes during analysis
      categorizer: (node) => ({ type: node.type }),
      width: this.d3Element.node().clientWidth,
      height: undefined, // we need to improve the way the canvas height gets calculated in d3-fg
      renderTooltip: this.tooltip && null, // disabling the built-in tooltip if another tooltip is defined
      colorHash: (stackTop, { d, decimalAdjust, allSamples, tiers }) => {
        // 0 = lowest unadjusted value, 1 = highest, can be <0 or >1 due to decimalAdjust
        const decimal = (dataTree.getStackTop(d) / highest) * (decimalAdjust || 1)
        const rgb = flameGradient(decimal)
        return rgb
      },
      clickHandler: null,
      renderLabel: getLabelRenderer(this)
    })
    this.flameGraph.sort((a, b) => {
      return sorter(a.data, b.data)
    })

    const wrapperNode = this.d3Chart.node()
    this.flameGraph.on('click', (nodeData, rect, pointerCoords) => {
      if (nodeData) {
        // Treat root node as a zoom out button
        if (nodeData.id === 0) {
          if (this.ui.zoomedNode) this.ui.zoomNode(null)
          return
        }

        // Show (and hide) tooltip instantly on click, no waiting for timeouts
        if (this.tooltip) {
          this.tooltip.show({
            nodeData,
            rect,
            pointerCoords,
            frameIsZoomed: this.zoomedNodeData === nodeData,
            wrapperNode,
            delay: 0
          })
        }

        this.ui.selectNode(nodeData)
      } else {
        if (this.tooltip) this.tooltip.hide({ delay: 0 })

        this.ui.zoomNode(null)
      }
    })

    this.flameGraph.on('hoverin', (nodeData, rect, pointerCoords) => {
      if (nodeData.id === 0) return

      this.hoveredNodeData = nodeData
      this.ui.highlightNode(nodeData)

      if (this.tooltip) {
        this.tooltip.show({
          nodeData,
          rect,
          pointerCoords,
          frameIsZoomed: this.zoomedNodeData === nodeData,
          wrapperNode
        })
      }
    })

    this.flameGraph.on('hoverout', (node) => {
      if (this.tooltip) {
        this.tooltip.hide()
      }
    })

    this.flameGraph.on('animationEnd', () => {
      // Update selection marker with new node position and size
      this.markNodeAsSelected(this.ui.selectedNode)

      // Show tooltip and highlight box for zoomed node after zoom completes
      if (this.ui.zoomedNode && this.ui.zoomedNode.id !== 0) {
        if (this.tooltip) {
          const rect = this.flameGraph.getNodeRect(this.ui.zoomedNode)
          this.tooltip.show({
            nodeData: this.ui.zoomedNode,
            rect,
            frameIsZoomed: true,
            wrapperNode: this.d3Chart.node(),
            pointerCoords: {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height
            },
            delay: 100
          })
        }
        this.ui.highlightNode(this.ui.zoomedNode)
        this.markNodeAsZoomed(this.ui.zoomedNode)
      } else {
        this.hoveredNodeData = this.ui.highlightedNode || this.ui.selectedNode
        this.highlightHoveredNodeOnGraph()
      }
    })

    // triggering the resize after the canvas rendered to take possible scrollbars into account
    this.resize()
  }

  highlightHoveredNodeOnGraph () {
    if (this.hoveredNodeData === null) {
      this.d3Highlighter.classed('show', false)
      this.d3HighlighterBox.classed('show', false)
      return
    }

    const rect = this.flameGraph.getNodeRect(this.hoveredNodeData)
    if (rect) {
      this.d3Highlighter.classed('show', true)
      this.applyRectToDiv(this.d3Highlighter, rect, true)

      this.d3HighlighterBox.classed('show', true)
      this.applyRectToDiv(this.d3HighlighterBox, rect)
    } else {
      this.d3Highlighter.classed('show', false)
      this.d3HighlighterBox.classed('show', false)
    }
  }

  markNodeAsSelected (node = null) {
    this.d3SelectionMarker.classed('hidden', !node)

    if (node) {
      const rect = this.flameGraph.getNodeRect(node)
      this.applyRectToDiv(this.d3SelectionMarker, rect)
    }
  }

  markNodeAsZoomed (node = null) {
    this.d3ZoomMarker.classed('hidden', !node)

    if (node) {
      const rect = this.flameGraph.getNodeRect(node)
      this.applyRectToDiv(this.d3ZoomMarker, {
        x: rect.x,
        y: rect.y + rect.height * 3,
        width: rect.width,
        height: rect.height * 3
      })
    }
  }

  applyRectToDiv (d3Div, rect, aboveRect = false) {
    const scrollTop = this.d3Chart.node().scrollTop

    // If aboveRect flag is true, draws this div extending up from the top of the rectangle
    const translate = aboveRect ? `translateX(${rect.x}px)` : `translate3d(${rect.x}px, ${rect.y - scrollTop - rect.height}px, 0)`
    const height = aboveRect ? rect.y - scrollTop - rect.height : rect.height

    d3Div
      .style('width', rect.width + 'px')
      .style('height', height + 'px')
      .style('transform', translate)
  }

  updateMarkerBoxes () {
    this.highlightHoveredNodeOnGraph()
    this.markNodeAsSelected(this.ui.selectedNode)
    if (this.ui.zoomedNode) this.markNodeAsZoomed(this.ui.zoomedNode)
  }

  resize () {
    const previousWidth = this.width
    this.width = this.d3Chart.node().clientWidth
    if (this.width !== previousWidth) {
      this.changedWidth = true
      this.draw()
    }
    this.updateMarkerBoxes()
  }

  getTree () {
    return this.ui.dataTree.activeTree()
  }

  clearSearch () {
    this.flameGraph.clear(searchHighlightColor)
  }

  search (query) {
    this.flameGraph.search(query, searchHighlightColor)
  }

  draw () {
    super.draw()

    if (this.changedWidth) {
      this.changedWidth = false
      this.flameGraph.width(this.width)
    }

    if (this.renderedTree !== this.getTree()) {
      this.renderedTree = this.getTree()
      this.flameGraph.renderTree(this.renderedTree)
    }

    // Highlight optimized frames in a very aggressive yellow…
    // TODO nicer styling, prob needs a d3-fg change to add some indicator element
    // or we could pick a more subtle background color.
    if (this.showOptimizationStatus !== this.ui.dataTree.showOptimizationStatus) {
      this.showOptimizationStatus = this.ui.dataTree.showOptimizationStatus
      if (this.showOptimizationStatus) {
        this.flameGraph.search(/^\*/, 'yellow')
      } else {
        this.flameGraph.clear('yellow')
      }
    }

    const { toHide, toShow } = this.ui.changedExclusions

    if (toHide.size > 0) {
      toHide.forEach((name) => {
        this.flameGraph.typeHide(name)
      })
    }
    if (toShow.size > 0) {
      toShow.forEach((name) => {
        this.flameGraph.typeShow(name)
      })
    }
  }
}

module.exports = FlameGraph
