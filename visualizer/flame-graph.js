'use strict'

// d3-fg is likely a temporary dep, most layout logic will move to analysis and
// most draw / interactivity logic will be replaced here
const d3Fg = require('d3-fg')
const flameGradient = require('flame-gradient')
const HtmlContent = require('./html-content.js')

const FgTooltipContainer = require('./flame-graph-tooltip-container')
const Message = require('./message.js')
const copy = require('copy-to-clipboard')

const searchHighlightColor = 'orange'

class FlameGraph extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    const defaults = {
      showOptimizationStatus: false
    }
    contentProperties = Object.assign({}, defaults, contentProperties)
    super(parentContent, contentProperties)

    this.hoveredNodeData = null
    this.changedWidth = false
    this.tooltip = contentProperties.customTooltip
    this.showOptimizationStatus = this.contentProperties.showOptimizationStatus

    this.highlightNodeTimeoutHandler = null
    this.ui.on('setData', () => {
      this.initializeFromData()
    })

    this.ui.on('zoomNode', node => {
      if (this.flameGraph) {
        this.flameGraph.zoom(node)
        this.hideToolTip()
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

    if (this.tooltip) {
      this.tooltip = new FgTooltipContainer({
        tooltip: this.tooltip,
        showDelay: 800,
        hideDelay: 400,
        onZoom: (nodeData) => {
          this.flameGraph.zoom(nodeData)
        },
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
      this.hoveredNodeData = node
      this.highlightHoveredNodeOnGraph()
    })

    this.ui.on('option.merge', (checked) => {
      this.draw()
      this.highlightHoveredNodeOnGraph()
    })

    // hiding the tooltip on scroll and moving the box
    this.d3Chart.node().addEventListener('scroll', () => {
      this.tooltip.hide({ delay: 0 })
      this.highlightHoveredNodeOnGraph()
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

    this.prevExclude = new Set(this.ui.dataTree.exclude)
    this.flameGraph = d3Fg({
      tree: dataTree.unmerged,
      exclude: dataTree.exclude,
      element: this.d3Chart.node(),
      topOffset: 55,
      cellHeight: 20,
      heatBars: true,
      frameColors: {
        fill: '#000',
        stroke: '#363b4c'
      },
      // We already categorized nodes during analysis
      categorizer: (node) => ({ type: node.type }),
      labelColors: {
        default: '#fff',
        app: '#cde3ff',
        core: '#626467',
        deps: '#3f7dc6'
      },
      width: this.d3Element.node().clientWidth,
      height: undefined, // we need to improve the way the canvas height gets calculated in d3-fg
      renderTooltip: this.tooltip && null, // disabling the built-in tooltip if another tooltip is defined
      colorHash: (stackTop, { d, decimalAdjust, allSamples, tiers }) => {
        // 0 = lowest unadjusted value, 1 = highest, can be <0 or >1 due to decimalAdjust
        const decimal = (dataTree.getStackTop(d) / highest) * (decimalAdjust || 1)
        const rgb = flameGradient(decimal)
        return rgb
      }
    })

    const wrapperNode = this.d3Chart.node()
    this.flameGraph.on('hoverin', (nodeData, rect, pointerCoords) => {
      clearTimeout(this.highlightNodeTimeoutHandler)
      // triggering the highlightNode event
      this.highlightNodeTimeoutHandler = setTimeout(() => {
        this.hoveredNodeData = nodeData
        this.ui.highlightNode(nodeData)
      }, 200)

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
      clearTimeout(this.highlightNodeTimeoutHandler)

      if (this.tooltip) {
        this.tooltip.hide()
      }
    })

    this.flameGraph.on('zoom', (nodeData) => {
      this.tooltip && this.tooltip.hide()

      this.highlightHoveredNodeOnGraph()
      this.zoomedNodeData = nodeData
    })

    this.flameGraph.on('animationEnd', () => {
      // can come handy to have this cb...
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
      this.d3Highlighter
        .classed('show', true)
        .style('width', rect.width + 'px')
        .style('height', `${rect.y - this.d3Chart.node().scrollTop - rect.height}px`)
        .style('transform', `translateX(${rect.x}px)`)

      this.d3HighlighterBox
        .classed('show', true)
        .style('width', rect.width + 'px')
        .style('height', `${rect.height}px`)
        .style('transform', `translate3d(${rect.x}px, ${rect.y - this.d3Chart.node().scrollTop - rect.height}px, 0)`)
    } else {
      this.d3Highlighter.classed('show', false)
      this.d3HighlighterBox.classed('show', false)
    }
  }

  resize () {
    const previousWidth = this.width
    this.width = this.d3Chart.node().clientWidth
    if (this.width !== previousWidth) {
      this.changedWidth = true
      this.draw()
    }

    this.highlightHoveredNodeOnGraph()
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
