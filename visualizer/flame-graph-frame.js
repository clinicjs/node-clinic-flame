'use strict'

function getFrameRenderer (bindTo) {
  return renderStackFrame.bind(bindTo)
}

function renderStackFrame (globals, locals, rect) {
  if (!this.flameGraph) return

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

  // For really tiny frames, draw a 1px thick pixel-aligned 'matchstick' line
  if (width <= 1.5) {
    const backgroundColor = this.ui.getFrameColor(nodeData, 'background', false)
    const foregroundColor = this.ui.getFrameColor(nodeData, 'foreground', false)
    renderAsLine(context, { x: left, y, height }, backgroundColor, foregroundColor, nodeData.highlight, heatHeight)
    return
  }

  // Don't redraw heat over previous paint on hover events, and don't draw for root node
  // if (state === STATE_IDLE && nodeData.id !== 0) renderHeatBar(context, nodeData, colorHash, alignedRect)
  if (state === STATE_IDLE && nodeData.id !== 0) {
    renderHeatBar(context, nodeData, colorHash, rect, heatHeight)
  }

  const backgroundColor = this.ui.getFrameColor(nodeData, 'background')
  const foregroundColor = this.ui.getFrameColor(nodeData, 'foreground')

  context.fillStyle = backgroundColor

  context.beginPath()
  context.rect(left, y, width, height)
  context.fill()

  // Add a light stroke to left, bottom and right indicating code area
  context.save()
  context.globalAlpha = this.ui.presentationMode ? 0.6 : 0.4
  context.strokeStyle = foregroundColor

  context.beginPath()
  context.lineWidth = thin
  context.moveTo(left, y)
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
  context.lineTo(right, y)
  context.stroke()
  context.restore()

  const childGroups = Object.entries(nodeData.childGroups).sort((a, b) => b[1] - a[1])
  const childGroupLength = childGroups.length
  let amountDrawn = 0

  // TODO: refactor a better way of applying context that isn't done each iteration
  const outline = renderAreaOutline.bind(this)

  for (let i = 0; i < childGroupLength; i++) {
    outline(childGroups[i][0], childGroups[i][1], node, amountDrawn, context)
    amountDrawn += childGroups[i][1]
  }
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

function renderAsLine (context, rect, backgroundColor, foregroundColor, isHighlighted, heatHeight) {
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
  context.strokeStyle = foregroundColor
  context.beginPath()
  context.moveTo(x, y)
  context.lineTo(x, y + height)
  context.stroke()
  context.restore()
}

function renderAreaOutline (key, value, parentNode, amountDrawn, context) {
  if (!value) return

  const widestNodeValue = this.ui.zoomedNode ? this.ui.zoomedNode.value
    // Use sum of next visible descendents as all stacks value, else includes excluded
    : this.ui.dataTree.getNextVisible().reduce((acc, node) => acc + node.value, 0)

  const decimalValue = value / widestNodeValue
  const decimalDrawn = amountDrawn / widestNodeValue

  const [category, type] = key.split(':')
  const areaChange = parentNode.data.category !== category || parentNode.data.type !== type
  console.log(areaChange, 'this:', category, type, 'parent:', parentNode.data.category, parentNode.data.type)

  const areaNode = {
    x0: parentNode.x0 + decimalDrawn,
    x1: parentNode.x0 + decimalDrawn + decimalValue,
    depth: parentNode.depth + 2,
    parent: parentNode
  }

  const rect = this.getNodeRect(areaNode)

  if (!rect) return

  const {
    x,
    y,
    width,
    height
  } = rect

  // Temporary styling for testing purposes
  // TODO: find a better way to stop these getting drawn over
  setTimeout(() => {
    context.globalAlpha = 0.3
    context.strokeStyle = areaChange ? 'rgb(255, 0, 255)' : 'rgb(0, 255, 0)'
    context.fillStyle = areaChange ? 'rgba(255, 0, 255, 0.1)' : 'rgba(0, 255, 0, 0.1)'
    context.beginPath()
    context.rect(x, y, width, height)
    context.stroke()
    context.fill()
    context.globalAlpha = 1
  })
}

module.exports = getFrameRenderer
