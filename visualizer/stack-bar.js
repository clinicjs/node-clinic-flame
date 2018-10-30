const d3 = require('d3')
const HtmlContent = require('./html-content.js')
const flameGradient = require('flame-gradient')

class StackBar extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.highlightedNode = null

    this.ui.on('highlightNode', node => {
      this.pointToNode(node || this.ui.selectedNode)
    })

    this.ui.on('selectNode', node => {
      this.pointToNode(node)
    })

    this.ui.on('option.merge', () => { this.draw() })
  }

  initializeElements () {
    super.initializeElements()

    this.d3StacksWrapper = this.d3Element.append('div')
      .classed('stacks-wrapper', true)

    this.d3Pointer = this.d3Element.append('div')
      .classed('pointer', true)
  }

  pointToNode (node) {
    this.highlightedNode = node
    this.draw()
  }

  getNodePosition (node) {
    let found = false
    let isInRemaining = false
    let left = 0
    let margin = 0
    let i = 0
    let frames = this.frames
    let totalWidth = this.d3StacksWrapper.node().getBoundingClientRect().width
    if (!frames || !node) return '0px'

    while (!found && i < frames.length - 1) {
      const frame = frames[i]
      found = node.id === frame.d.id

      margin += found ? 0 : frame.margin
      left += found ? frame.width / 2 : frame.width
      i++
    }

    if (!found) {
      isInRemaining = frames[frames.length - 1].remaining.some((smallFrame) => smallFrame.id === node.id)
    }

    return found || isInRemaining ? `${left * totalWidth + margin}px` : '-20px'
  }

  prepareFrames () {
    if (process.env.DEBUG_MODE) {
      console.time('StackBar.prepareFrames')
    }

    const { dataTree } = this.ui
    const rootNode = dataTree.activeTree()
    const highest = dataTree.getHighestStackTop()
    const availableWidth = this.d3Element.node().getBoundingClientRect().width
    const onePxPercent = 1 / availableWidth

    const frames = []
    let usedWidth = 0.0

    for (let i = 0; i < dataTree.flatByHottest.length; i++) {
      const d = dataTree.flatByHottest[i]
      const stackTop = dataTree.getStackTop(d)
      const highestFraction = stackTop / highest
      const totalFraction = Math.max(onePxPercent, stackTop / rootNode.value)

      const width = totalFraction
      const margin = totalFraction > 0.02 ? 2 : 1

      frames.push({ d, width, margin, colorValue: highestFraction })

      usedWidth += width + (margin / availableWidth)
      if (usedWidth >= 0.98) {
        const remaining = dataTree.flatByHottest.slice(i + 1)
        const remainingFraction = dataTree.getStackTop(remaining[0]) / highest
        frames.push({ remaining, width: 1 - usedWidth, margin: 0, colorValue: remainingFraction })
        break
      }
    }
    if (process.env.DEBUG_MODE) {
      console.timeEnd('StackBar.prepareFrames')
    }
    return frames
  }

  draw () {
    super.draw()

    const { dataTree } = this.ui

    if (dataTree.flatByHottest === null) {
      return
    }

    if (process.env.DEBUG_MODE) {
      console.time('StackBar.draw')
    }

    // const rootNode = dataTree.activeTree()
    this.frames = this.prepareFrames()
    const ui = this.ui

    // const highest = dataTree.getHighestStackTop()
    const update = this.d3StacksWrapper.selectAll('div')
      .data(this.frames)
    update.exit().remove()

    const self = this

    update.enter().append('div')
      .classed('stack-frame', true)
      .merge(update)
      .each(function (data) {
        const { width, margin, colorValue } = data

        const isHighlighted = data.d && self.highlightedNode && (self.highlightedNode.id === data.d.id)

        d3.select(this)
          .classed('selected', isHighlighted)
          .style('background-color', flameGradient(colorValue))
          .style('width', `${(width * 100).toFixed(3)}%`)
          .style('margin-right', `${margin}px`)
      })
      .on('mouseover', data => {
        // triggering the `highlightNode` event on ui
        ui.highlightNode(data.d)
      })
      .on('mouseout', () => {
        // triggering the `highlightNode` event on ui
        ui.highlightNode(null)
      })

    // moving the selector over the bar
    const left = this.getNodePosition(self.highlightedNode)
    this.d3Pointer.style('transform', `translateX(${left})`)

    this.d3Pointer.classed('hidden', left === null)

    if (process.env.DEBUG_MODE) {
      console.timeEnd('StackBar.draw')
    }
  }
}

module.exports = StackBar
