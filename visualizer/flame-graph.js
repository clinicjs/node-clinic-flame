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
      useMergedTree: false,
      showOptimizationStatus: false
    }
    contentProperties = Object.assign({}, defaults, contentProperties)
    super(parentContent, contentProperties)

    this.hoveredNodeData = null
    this.changedWidth = false
    this.tooltip = contentProperties.customTooltip
  }

  initializeElements () {
    super.initializeElements()
    this.d3Chart = this.d3Element.append('chart')
      .classed('flamegraph-outer', true)
      .style('position', 'relative')

    if (this.tooltip) {
      this.tooltip = new FgTooltipContainer({
        tooltip: this.tooltip,
        showDelay: 500,
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
  }

  initializeFromData () {
    this.renderedTree = this.getTree()

    // TODO rather than calculating this single value here, we should be walking through
    // all the nodes and sorting high stackTop values, so we can
    // 1) display a heat key at the top;
    // 2) pick the highest value from that list for use here.
    const highest = this.getHighestStackTop(this.renderedTree)

    this.prevExclude = new Set(this.ui.exclude)
    this.flameGraph = d3Fg({
      tree: this.renderedTree,
      exclude: this.ui.exclude,
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
        const decimal = (this.getStackTop(d) / highest) * (decimalAdjust || 1)
        const rgb = flameGradient(decimal)
        return rgb
      }
    })

    if (this.tooltip) {
      const wrapperNode = this.d3ContentWrapper.node()
      this.flameGraph.on('hoverin', (nodeData, rect, pointerCoords) => {
        this.tooltip.show({
          nodeData,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.w,
            height: rect.h
          },
          pointerCoords,
          frameIsZoomed: this.zoomedNodeData === nodeData,
          wrapperNode
        })
      })
      this.flameGraph.on('hoverout', (node) => {
        this.tooltip.hide()
      })
    }

    this.flameGraph.on('zoom', (nodeData) => {
      this.tooltip && this.tooltip.hide()
      this.zoomedNodeData = nodeData
    })

    this.flameGraph.on('animationEnd', () => {
      // can come handy to have this cb...
    })

    // triggering the resize after the canvas rendered to take possible scrollbars into account
    this.resize()
  }

  getHighestStackTop (tree) {
    return tree.children
      ? tree.children.reduce((highest, child) => {
        const newValue = this.getHighestStackTop(child)
        return newValue > highest ? newValue : highest
      }, this.getStackTop(tree))
      : 0
  }

  getStackTop (frame) {
    let stackTop = frame.stackTop.base
    this.ui.exclude.forEach((excluded) => {
      stackTop += frame.stackTop[excluded]
    })
    return stackTop
  }

  resize () {
    const previousWidth = this.width
    this.width = this.d3Element.node().clientWidth
    if (this.width !== previousWidth) {
      this.changedWidth = true
      this.draw()
    }
  }

  getTree () {
    if (this.contentProperties.useMergedTree) {
      return this.ui.dataTree.merged
    }
    return this.ui.dataTree.unmerged
  }

  clearSearch () {
    this.flameGraph.clear(searchHighlightColor)
  }

  search (query) {
    this.flameGraph.search(query, searchHighlightColor)
  }

  draw () {
    super.draw()
    if (!this.flameGraph) this.initializeFromData()

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
    if (this.contentProperties.showOptimizationStatus) {
      this.flameGraph.search(/^\*/, 'yellow')
    } else {
      this.flameGraph.clear('yellow')
    }

    const newExclude = this.ui.exclude
    const changedExcludes = this.prevExclude.size !== newExclude.size ||
      // Very hacky but easy way to check that their elements do not 100% intersect
      Array.from(this.prevExclude).sort().join(',') !== Array.from(newExclude).sort().join(',')

    if (changedExcludes) {
      newExclude.forEach((name) => {
        if (!this.prevExclude.has(name)) {
          this.flameGraph.typeHide(name)
        }
      })
      this.prevExclude.forEach((name) => {
        if (!newExclude.has(name)) {
          this.flameGraph.typeShow(name)
        }
      })
      this.prevExclude = new Set(newExclude)
    }
  }
}

module.exports = FlameGraph
