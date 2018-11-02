'use strict'

function getFrameRenderer (bindTo) {
  return renderStackFrame.bind(bindTo)
}

function renderStackFrame (globals, locals, rect) {
  const {
    colorHash,
    frameColors,
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

  // Do nothing for frames excluded by zoom, unless we're still animating
  if (nodeData.value === 0 && !this.isAnimating) return

  // Align with pixel grid to avoid fuzzy 2px lines of inconsistent stroke color
  // Round everything towards being smaller so lines don't draw over each other
  const roundedHeight = Math.floor(height) - 1
  const roundedWidth = Math.floor(width) - 1

  const top = alignUp(y)
  const bottom = top + roundedHeight

  const left = alignUp(x)
  let right = left + roundedWidth
  if (right <= left) right++

  const alignedRect = {
    x: left,
    y: top,
    width: roundedWidth,
    height: roundedHeight
  }

  // For really tiny frames, draw a 1px thick pixel-aligned 'matchstick' line
  if (width <= 1.5) {
    renderAsLine(context, rect, frameColors.fill, this.ui.exposedCSS[nodeData.category], colorHash(nodeData))
    return
  }

  // Don't redraw heat over previous paint on hover events, and don't draw for root node
  if (state === STATE_IDLE && nodeData.id !== 0) renderHeatBar(context, nodeData, colorHash, alignedRect)

  // Give rect an initial solid stroke using fill color so things behind
  // e.g. heat bar don't show through
  context.fillStyle = frameColors.fill
  context.strokeStyle = frameColors.fill

  context.beginPath()
  context.rect(left, top, alignDown(width) - 1, alignDown(height))
  context.fill()
  context.stroke()

  // Add a light stroke to left, bottom and right indicating code area
  context.save()
  context.globalAlpha = 0.2
  context.strokeStyle = this.ui.exposedCSS[nodeData.category]
  context.beginPath()
  context.moveTo(left, top)
  context.lineTo(left, bottom)
  context.lineTo(right, bottom)
  context.lineTo(right, top)
  context.stroke()
  context.restore()
}

function renderHeatBar (context, nodeData, colorHash, rect) {
  // Extracted from d3-fg so we can pixel-align it to match the rest
  const heatColor = colorHash(nodeData)
  const heatStrokeColor = colorHash(nodeData, 1.1)
  const heatHeight = getHeatHeight(rect.height)

  context.fillStyle = heatColor
  context.strokeStyle = heatStrokeColor
  context.beginPath()
  context.rect(rect.x, rect.y - heatHeight, rect.width, heatHeight)
  context.fill()
  context.stroke()
}

function renderAsLine (context, rect, fillCol, areaCol) {
  const {
    x,
    y,
    height
  } = rect

  // Black solid background line, including black heat area
  context.strokeStyle = fillCol
  context.beginPath()
  context.moveTo(x, y - getHeatHeight(height))
  context.lineTo(x, y + height)
  context.stroke()

  // Add code area tint to the appropriate part of the line
  context.save()
  context.globalAlpha = 0.2
  context.strokeStyle = areaCol
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(x, y + height)
  context.stroke()
  context.restore()
}

function alignUp (num) {
  return Math.round(num + 0.5) + 0.5
}

function alignDown (num) {
  return Math.round(num - 0.5) - 0.5
}

function getHeatHeight (height) {
  return Math.ceil(height / 3)
}

module.exports = getFrameRenderer
