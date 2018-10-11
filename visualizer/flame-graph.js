'use strict'

// d3-fg is likely a temporary dep, most layout logic will move to analysis and
// most draw / interactivity logic will be replaced here
const d3Fg = require('d3-fg')
const flameGradient = require('flame-gradient')
const HtmlContent = require('./html-content.js')

class FlameGraph extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    const defaults = {
      width: 1000, // For testing, usually overridden by window width
      height: 600, // For testing, usually overridden by window width
      padding: 12
    }
    contentProperties = Object.assign({}, defaults, contentProperties)
    super(parentContent, contentProperties)

    this.changedWidth = false
  }

  initializeElements () {
    super.initializeElements()
    this.d3Chart = this.d3Element.append('chart')
      .classed('flamegraph-outer', true)
  }

  initializeFromData () {
    const {
      width,
      height,
      padding
    } = this.contentProperties

    // TODO rather than calculating this single value here, we should be walking through
    // all the nodes and sorting high stackTop values, so we can
    // 1) display a heat key at the top;
    // 2) pick the highest value from that list for use here.
    const highest = this.getHighestStackTop(this.ui.dataTree.unmerged)

    this.flameGraph = d3Fg({
      tree: this.ui.dataTree.unmerged,
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
      width: width - 2 * padding,
      height,
      colorHash: (stackTop, { d, decimalAdjust, allSamples, tiers }) => {
        // 0 = lowest unadjusted value, 1 = highest, can be <0 or >1 due to decimalAdjust
        const decimal = (this.getStackTop(d) / highest) * (decimalAdjust || 1)
        const rgb = flameGradient(decimal)
        return rgb
      }
    })
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

  resize (width) {
    const previousWidth = this.width
    this.width = width - 2 * this.contentProperties.padding
    if (this.width !== previousWidth) {
      this.changedWidth = true
      this.draw()
    }
  }

  draw () {
    super.draw()
    if (!this.flameGraph) this.initializeFromData()

    if (this.changedWidth) {
      this.changedWidth = false
      this.flameGraph.width(this.width)
    }
  }
}

module.exports = FlameGraph
