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

  const top = Math.ceil(y) - 0.5
  const left = Math.ceil(x) - 0.5
  const right = Math.floor(x + width) - 0.5
  const bottom = Math.floor(y + height) - 0.5

  // For really tiny frames, draw a 1px thick pixel-aligned 'matchstick' line
  if (width <= 1.5) {
    const backgroundColor = this.ui.getFrameColor(nodeData, 'background', false)
    const borderColor = this.ui.getFrameColor(nodeData, 'border', false)
    renderAsLine(context, { x: left, y, height }, backgroundColor, borderColor, nodeData.highlight, heatHeight)
    return
  }

  // Don't redraw heat over previous paint on hover events, and don't draw for root node
  // if (state === STATE_IDLE && nodeData.id !== 0) renderHeatBar(context, nodeData, colorHash, alignedRect)
  if (state === STATE_IDLE && nodeData.id !== 0) {
    renderHeatBar(context, nodeData, colorHash, rect, heatHeight)
  }

  const backgroundColor = this.ui.getFrameColor(nodeData, 'background')
  const borderColor = this.ui.getFrameColor(nodeData, 'border')

  context.fillStyle = backgroundColor

  context.beginPath()
  context.rect(left, y, width, height)
  context.fill()

  // Add a light stroke to left, bottom and right indicating code area
  context.save()
  context.globalAlpha = (this.ui.presentationMode || nodeData.isOtherOccurrence) ? 0.6 : 0.4

  context.strokeStyle = borderColor

  context.beginPath()
  context.lineWidth = thin
  context.moveTo(left, top)
  context.lineTo(left, bottom - lineWidth)
  context.stroke()

  context.beginPath()
  context.lineWidth = lineWidth
  context.moveTo(left, bottom - lineWidth)
  context.lineTo(right, bottom - lineWidth)
  context.stroke()

  context.beginPath()
  context.lineWidth = thin
  context.moveTo(right, bottom - lineWidth)
  context.lineTo(right, top)
  context.stroke()

  if (nodeData.isOtherOccurrence) {
    context.beginPath()
    context.lineWidth = thick
    context.moveTo(right, top)
    context.lineTo(left, top)
    context.stroke()
  }

  context.restore()
}

function renderHeatBar (context, nodeData, colorHash, rect, heatHeight) {
  // Extracted from d3-fg so we can pixel-align it to match the rest
  const heatColor = colorHash(nodeData)
  const heatStrokeColor = colorHash(nodeData, 1.1)

  context.fillStyle = heatColor
  context.strokeStyle = heatStrokeColor
  context.beginPath()
  context.rect(rect.x, rect.y - heatHeight, rect.width, heatHeight)
  context.fill()
  context.stroke()
}

function renderAsLine (context, rect, backgroundColor, borderColor, isHighlighted, heatHeight) {
  const {
    x,
    y,
    height
  } = rect

  // Black solid background line, including black heat area
  context.strokeStyle = backgroundColor
  context.beginPath()
  context.moveTo(x, y - heatHeight)
  context.lineTo(x, y + height)
  context.stroke()

  // Add code area tint to the appropriate part of the line
  context.save()

  // Bolden any tiny active search matches
  context.globalAlpha = isHighlighted ? 0.9 : 0.2
  context.strokeStyle = borderColor
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(x, y + height)
  context.stroke()
  context.restore()
}

module.exports = getFrameRenderer
