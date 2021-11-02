'use strict'

function getFrameRenderer (bindTo) {
  return renderStackFrame.bind(bindTo)
}

function renderStackFrame (globals, locals, rect) {
  const {
    colorHash,
    STATE_IDLE
  } = globals
  const {
    context,
    node,
    state
  } = locals
  const {
    x,
    y,
    width,
    height
  } = rect

  const nodeData = node.data
  const thick = 3
  const thin = 1
  const lineWidth = this.ui.presentationMode ? thick : thin
  const heatHeight = Math.ceil(rect.height / (this.ui.presentationMode ? 2.5 : 3))

  // Do nothing for frames excluded by zoom, unless we're still animating
  if (nodeData.value === 0 && !this.isAnimating) return

  // Align with pixel grid to avoid fuzzy 2px lines of inconsistent stroke color
  // Round everything towards being smaller so lines don't draw over each other

  const left = Math.floor(x) + 1.5
  const right = Math.ceil(left + width) - 1.5
  const bottom = Math.floor(y + height) + 0.5
  const top = Math.ceil(y) - 0.5

  // Don't redraw heat over previous paint on hover events, and don't draw for root node
  const doDrawHeatBar = state === STATE_IDLE && nodeData.id !== 0
  if (doDrawHeatBar) {
    renderHeatBar(context, nodeData, colorHash, {
      x: left,
      y: top,
      width: Math.ceil(width) - 1.5,
      height: heatHeight
    })
  }

  const backgroundColor = this.ui.getFrameColor(nodeData, 'background')
  const foregroundColor = this.ui.getFrameColor(nodeData, 'foreground')

  context.fillStyle = backgroundColor

  context.beginPath()
  context.rect(left, y, width, height)

  context.save()

  // Make the very narrowest frames feinter relative to how narrow they are
  if (width > lineWidth) context.globalAlpha = Math.min(1, Math.max(width - lineWidth, 0.5) / lineWidth * 3)
  // Clear before fill so that even if very narrow frames are feint, height from below doesn't show through
  context.clearRect(left, y, Math.min(width, 0.1), height)
  context.fill()

  const visibleParent = this.getVisibleParent(node)
  if (!visibleParent) {
    context.restore()
    return
  }

  // Add a light stroke to left, bottom and right indicating code area

  const visibleSiblings = this.ui.dataTree.getVisibleChildren(visibleParent)

  const indexPosition = visibleSiblings.indexOf(node)
  const previousSibling = indexPosition > 0 ? visibleSiblings[indexPosition - 1] : null
  const nextSibling = visibleSiblings[indexPosition + 1] || null

  // .getNodeRect() is not yet accessible here because this is called while the d3-fg Flamegraph is being constructed
  // but actual pixel width can be calculated using available data
  const widthRatio = width / (node.x1 - node.x0)

  // On narrow frames with no fill between the two lines, fade lines relative to width. Is 1 if width > two lineWidths
  const thinFrameReducer = Math.min(1, (width || 0.1) / (lineWidth * 2))

  // For a narrow right-hand edge of a block of frames of the same code area...
  const rightEdgeReducer = (thinFrameReducer === 1 || !previousSibling || (!!nextSibling && sameArea(nodeData, nextSibling.data)))
    ? thinFrameReducer
    // ...fade as above, but based on the width of these same-area siblings, not just this node, so that
    // something like   [ someFunc    ./file.js ][ f ./file.js ][][]|||   gets a visible right hand edge
    : Math.min(1, visibleSiblings.slice(0, indexPosition).reduce((acc, sibling) => acc + (sameArea(nodeData, sibling.data) ? (sibling.x1 - sibling.x0) * widthRatio : 0), 0) / (lineWidth * 2))

  const alphaFull = this.ui.presentationMode ? 0.8 : 0.7
  const alphaReduced = this.ui.presentationMode ? 0.25 : 0.2

  const areaChangeBelow = !sameArea(nodeData, visibleParent.data)
  const areaChangeLeft = !previousSibling || !sameArea(nodeData, previousSibling.data)
  const areaChangeRight = !nextSibling || !sameArea(nodeData, nextSibling.data)

  const leftGapRemover = !areaChangeLeft && areaChangeBelow ? 1 : 0

  context.globalAlpha = (areaChangeBelow ? alphaFull : alphaReduced) * thinFrameReducer

  context.lineWidth = lineWidth

  context.strokeStyle = foregroundColor

  context.beginPath()
  context.moveTo(left - leftGapRemover, bottom - lineWidth)
  context.lineTo(right, bottom - lineWidth)
  context.stroke()

  context.lineWidth = lineWidth

  context.globalAlpha = (areaChangeLeft ? alphaFull : alphaReduced) * thinFrameReducer
  context.beginPath()
  context.lineWidth = thin
  context.moveTo(left, top)
  context.lineTo(left, bottom - (areaChangeBelow ? lineWidth : 0))
  context.stroke()

  context.globalAlpha = (areaChangeRight ? alphaFull : alphaReduced) * rightEdgeReducer
  context.beginPath()
  context.lineWidth = thin
  context.moveTo(right, bottom - (areaChangeBelow ? lineWidth : 0))
  context.lineTo(right, top)
  context.stroke()

  if (doDrawHeatBar) {
    // Complete the outline at any visible stack top by drawing along the entire top, under any children
    context.beginPath()
    context.moveTo(right, top)
    context.lineTo(right, top - heatHeight)
    context.lineTo(left, top - heatHeight)
    context.lineTo(left, top)
    context.stroke()

    context.globalAlpha = alphaReduced * thinFrameReducer
    context.beginPath()
    context.moveTo(left, top)
    context.lineTo(right, top)
    context.stroke()
  }

  context.restore()

  if (areaChangeBelow && areaChangeRight) {
    let priorSiblingWidth = 0

    for (let i = indexPosition - 1; i >= 0; i--) {
      if (!sameArea(nodeData, visibleSiblings[i].data)) {
        break
      }
      priorSiblingWidth += (visibleSiblings[i].x1 - visibleSiblings[i].x0) * widthRatio
    }

    this.labelArea({ context: this.overlayContext, node, state }, rect, priorSiblingWidth, lineWidth, alphaFull)
  }
}

function renderHeatBar (context, nodeData, colorHash, rect) {
  // Extracted from d3-fg so we can pixel-align it to match the rest
  const heatColor = colorHash(nodeData)
  const heatStrokeColor = colorHash(nodeData, 1.1)

  context.fillStyle = heatColor
  context.strokeStyle = heatStrokeColor
  context.beginPath()
  context.rect(rect.x, rect.y - rect.height, rect.width, rect.height)
  context.fill()
  context.stroke()
}

function sameArea (nodeDataA, nodeDataB) {
  return nodeDataA.type === nodeDataB.type && nodeDataA.category === nodeDataB.category
}

module.exports = getFrameRenderer
