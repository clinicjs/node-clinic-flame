const d3 = require('./d3.js')
const HtmlContent = require('./html-content.js')

class StackBar extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.highlightedNode = null
    this.highlightedNodeTimeoutHandler = null
    this.frameTooltipHandler = null

    this.tooltip = contentProperties.tooltip
    this.tooltipHtmlContent = contentProperties.tooltipHtmlContent

    this.tooltipHtmlContent.getTooltipD3()
      .on('mouseenter', () => {
        clearTimeout(this.highlightedNodeTimeoutHandler)
        // this.ui.highlightNode(this.ui.selectedNode)
      })
      .on('mouseleave', () => {
        this.ui.highlightNode(this.ui.selectedNode)
      })

    this.ui.on('highlightNode', node => {
      this.pointToNode(node || this.ui.selectedNode)
    })

    this.ui.on('selectNode', node => {
      this.pointToNode(node)
    })

    this.ui.on('zoomNode', () => {
      this.draw()
    })
  }

  initializeElements () {
    super.initializeElements()

    const ui = this.ui

    this.d3StacksWrapper = this.d3Element.append('div')
      .classed('stacks-wrapper', true)
      .on('mousemove', () => {
        clearTimeout(this.highlightedNodeTimeoutHandler)

        const nodeElem = this.getNodeAtX(d3.event.offsetX)
        if (!nodeElem) return

        const nodeData = nodeElem.d
        ui.highlightNode(nodeElem.d)

        const wrapperRect = this.d3StacksWrapper.node().getBoundingClientRect()

        if (!nodeData) {
          this.tooltip.hide()
          return
        }

        this.tooltipHtmlContent.setNodeData(nodeData)
        this.tooltip.show({
          msg: this.tooltipHtmlContent.getTooltipD3().node(),
          pointerCoords: { x: d3.event.offsetX, y: d3.event.offsetY },
          targetRect: wrapperRect,
          wrapperNode: this.d3StacksWrapper.node()
        })
      })
      .on('mouseout', () => {
        clearTimeout(this.highlightedNodeTimeoutHandler)
        this.highlightedNodeTimeoutHandler = setTimeout(() => {
          ui.highlightNode(this.ui.selectedNode)
          this.tooltip.hide(200)
        }, 200)
      })
      .on('click', () => {
        const nodeElem = this.getNodeAtX(d3.event.offsetX)
        if (!nodeElem) return

        const nodeData = nodeElem.d
        if (nodeData) {
          this.ui.highlightNode(nodeData)
          this.ui.selectNode(nodeData)
        }
      })
      .on('dblclick', () => {
        const nodeElem = this.getNodeAtX(d3.event.offsetX)
        if (!nodeElem) return

        const nodeData = nodeElem.d
        if (nodeData) {
          this.ui.zoomNode(nodeData)
        }
      })

    this.d3Pointer = this.d3Element.append('div')
      .classed('pointer', true)
  }

  pointToNode (node) {
    this.highlightedNode = node
    this.draw()
  }

  getNodeAtX (x) {
    const totalWidth = this.d3StacksWrapper.node().getBoundingClientRect().width

    let left = 0
    return this.frames.find(frame => {
      left += totalWidth * frame.width + frame.margin
      return left > x
    })
  }

  getNodePosition (node) {
    let found = false
    let isInRemaining = false
    let left = 0
    let margin = 0
    let i = 0
    const frames = this.frames
    const totalWidth = this.d3StacksWrapper.node().getBoundingClientRect().width
    if (!frames || !node) return '0px'

    while (!found && i < frames.length - 1) {
      const frame = frames[i]
      found = node.id === frame.d.id

      margin += found ? 0 : frame.margin
      left += found ? frame.width / 2 : frame.width
      i++
    }

    if (!found) {
      const lastFrame = frames[frames.length - 1]
      // This may not be an aggregate `remaining` frame if all frames fit on the stack bar,
      // which can happen on small profiles or with aggressive filters.
      isInRemaining = Array.isArray(lastFrame.remaining) &&
        lastFrame.remaining.some((smallFrame) => smallFrame.id === node.id)
    }

    return found || isInRemaining ? `${left * totalWidth + margin}px` : '-20px'
  }

  prepareFrames () {
    if (process.env.DEBUG_MODE) {
      console.time('StackBar.prepareFrames')
    }

    const { dataTree } = this.ui
    const rootNode = this.ui.zoomedNode || dataTree.activeTree()

    // flattening the children array and sorting the frames
    dataTree.sortFramesByHottest(this.ui.zoomedNode)

    const availableWidth = this.d3Element.node().getBoundingClientRect().width
    const onePxPercent = 1 / availableWidth

    const frames = []
    let usedWidth = 0.0

    for (let i = 0; i < dataTree.flatByHottest.length; i++) {
      const d = dataTree.flatByHottest[i]
      const stackTop = d.onStackTop.asViewed
      const totalFraction = Math.max(onePxPercent, stackTop / rootNode.value)

      const width = totalFraction
      const margin = totalFraction > 0.02 ? 2 : 1

      frames.push({ d, width, margin })

      usedWidth += width + (margin / availableWidth)
      if (usedWidth >= 0.98) {
        const remaining = dataTree.flatByHottest.slice(i + 1)
        frames.push({ remaining, width: 1 - usedWidth, margin: 0 })
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
    this.frames = this.prepareFrames()

    const update = this.d3StacksWrapper.selectAll('div')
      .data(this.frames)
    update.exit().remove()

    const self = this

    update.enter().append('div')
      .classed('stack-frame', true)
      .merge(update)
      .each(function (data) {
        const { width, margin } = data

        const isHighlighted = data.d && self.highlightedNode && (self.highlightedNode.id === data.d.id)
        const isSelected = data.d && self.ui.selectedNode && (self.ui.selectedNode.id === data.d.id)

        d3.select(this)
          .classed('highlighted', isHighlighted)
          .classed('selected', isSelected)
          .style('background-color', self.ui.dataTree.getHeatColor(data.d))
          .style('width', `${(width * 100).toFixed(3)}%`)
          .style('margin-right', `${margin}px`)
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
