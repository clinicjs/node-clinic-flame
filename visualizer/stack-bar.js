const d3 = require('d3')
const HtmlContent = require('./html-content.js')
const flameGradient = require('flame-gradient')

class StackBar extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.highlightedNode = null
    this.timeoutHandler = null

    this.ui.on('highlightNode', node => {
      this.pointToNode(node || this.ui.selectedNode)
    })

    this.ui.on('selectNode', node => {
      this.pointToNode(node)
    })
  }

  initializeElements () {
    super.initializeElements()

    const ui = this.ui

    this.d3StacksWrapper = this.d3Element.append('div')
      .classed('stacks-wrapper', true)
      .on('mouseover', function () {
        clearTimeout(this.timeoutHandler)

        if (d3.event.target === this) return
        const nodeData = getNodeDataFromEvent()
        if (nodeData) ui.highlightNode(nodeData.d)
      })
      .on('mouseout', function () {
        clearTimeout(this.timeoutHandler)
        this.timeoutHandler = setTimeout(() => {
          ui.highlightNode(null)
        }, 200)
      })
      .on('click', function () {
        const nodeData = getNodeDataFromEvent()
        if (nodeData) ui.selectNode(nodeData.d)
      })

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
    const highest = dataTree.highestStackTop
    const availableWidth = this.d3Element.node().getBoundingClientRect().width
    const onePxPercent = 1 / availableWidth

    const frames = []
    let usedWidth = 0.0

    for (let i = 0; i < dataTree.flatByHottest.length; i++) {
      const d = dataTree.flatByHottest[i]
      const stackTop = d.onStackTop.asViewed
      const highestFraction = stackTop / highest
      const totalFraction = Math.max(onePxPercent, stackTop / rootNode.value)

      const width = totalFraction
      const margin = totalFraction > 0.02 ? 2 : 1

      frames.push({ d, width, margin, colorValue: highestFraction })

      usedWidth += width + (margin / availableWidth)
      if (usedWidth >= 0.98) {
        const remaining = dataTree.flatByHottest.slice(i + 1)
        const remainingFraction = remaining[0].onStackTop.asViewed / highest
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
        const isSelected = data.d && self.ui.selectedNode && (self.ui.selectedNode.id === data.d.id)

        d3.select(this)
          .classed('highlighted', isHighlighted)
          .classed('selected', isSelected)
          .style('background-color', flameGradient(colorValue))
          .style('width', `${(width * 100).toFixed(3)}%`)
          .style('margin-right', `${margin}px`)
          .on('click', data => {
            // selecting the node
            self.ui.selectNode(data.d)
          })
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

function getNodeDataFromEvent () {
  const d3Hover = d3.select(d3.event.target)
  const nodeData = d3Hover.datum()
  return nodeData
}

module.exports = StackBar
