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
    const { width, height } = this.contentProperties

    this.flameGraph = d3Fg({
      tree: this.ui.dataTree.unmerged,
      exclude: this.ui.exclude,
      element: this.d3Chart.node(),
      topOffset: 0,
      width: width - 2 * this.contentProperties.padding,
      height,
      colorHash: (stackTop, { d, decimalAdjust, allSamples, tiers }) => {
        // 0 = lowest unadjusted value, 1 = highest, can be <0 or >1 due to decimalAdjust
        const decimal = (this.getStackTop(d) / allSamples) * (decimalAdjust || 1)
        const rgb = flameGradient(decimal)
        return rgb
      }
    })
  }

  getStackTop (frame) {
    let stackTop = 0
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
