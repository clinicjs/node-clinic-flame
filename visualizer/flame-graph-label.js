'use strict'

function getFrameLabeler (bindTo) {
  return renderFrameLabel.bind(bindTo)
}

function getAreaLabeler (bindTo) {
  return renderAreaLabel.bind(bindTo)
}

function renderFrameLabel (frameHeight, options) {
  const {
    context,
    node,
    x,
    y,
    width
  } = options
  const nodeData = node.data

  // Don't spend any time in frames with less than one padding width between left/right padding
  if (this.labelPadding * 3 > width) return

  // keeping the same font-size used in the App (assuming the user didn't change the browser default font-size)
  const fontSize = 10 + this.zoomFactor
  const btmOffset = (frameHeight - fontSize) / 2
  const yBottom = y + frameHeight - btmOffset - 3

  context.font = `${fontSize}px ${this.labelFont}`
  context.fillStyle = this.ui.getFrameColor(nodeData, 'foreground')

  // Reverse text and background for any current search matches
  // Use root node as a zoom out button, blank when not zoomed in
  if (nodeData.id === 0) {
    if (!this.ui.zoomedNode) return

    const availableWidth = width - this.labelPadding * 2
    const xMid = x + availableWidth / 2 + this.labelPadding
    rootNodeLabel(context, xMid, yBottom, availableWidth, this.ui.dataTree.appName)
    return
  }

  // TODO - use truncated form of fileName e.g. no /node_modules/ if it's deps
  // Must have implemented the bars for code area changes first
  let fileName = nodeData.fileName
  let functionName = nodeData.functionName

  if (nodeData.isInlinable) functionName += ' (inlinable)'

  if (this.ui.dataTree.showOptimizationStatus && (nodeData.isOptimized || nodeData.isUnoptimized)) {
    functionName += ` (${nodeData.isOptimized ? 'opt.' : 'unopt.'})`
  }

  if (fileName === null) {
    if (nodeData.type === 'v8') fileName = 'Compiled V8 C++'
    if (nodeData.type === 'cpp') fileName = 'Compiled C++'
    if (nodeData.type === 'wasm') fileName = 'Compiled WebAssembly'
  }
  if (nodeData.category === 'deps') fileName = fileName.replace(/\.\.?[\\/]node_modules[\\/]/, '')

  const funcNameWidth = context.measureText(functionName).width
  const fileNameWidth = context.measureText(fileName).width

  // Truncate if there's not enough space for |[padding][functionName][  >= padding   ][fileName][padding]|
  const fullTextWidth = this.labelPadding * 3 + funcNameWidth + fileNameWidth

  if (fullTextWidth <= width) {
    // There's enough space. See if there's even space for :line:col like some/path/file.js:123:12
    // (C++ frames don't have line numbers)
    if (nodeData.lineNumber != null) {
      const lineAndColumn = `:${nodeData.lineNumber}:${nodeData.columnNumber}`
      const extraTextWidth = fullTextWidth + context.measureText(lineAndColumn).width

      fileName = extraTextWidth < width ? fileName + lineAndColumn : fileName
    }
  } else if (this.labelPadding * 4 + funcNameWidth > width) {
    // No file name at all if there's no space for more than one padding width's worth
    fileName = ''

    // See if the functionName itself needs truncating
    if (this.labelPadding * 2 + funcNameWidth > width) {
      const availableWidth = width - this.labelPadding * 2
      functionName = truncateFunctionName(context, availableWidth, functionName, funcNameWidth)
    }
  } else {
    // There's space for the filename but not the complete functionName
    // See if we can isolate a file name from its path and show just that
    const pathSeparator = this.ui.dataTree.pathSeparator
    const availableWidth = width - this.labelPadding * 3 - funcNameWidth
    fileName = truncateFileName(context, availableWidth, fileName, pathSeparator, nodeData)
  }

  const coords = {
    leftX: x + this.labelPadding,
    rightX: x + width - this.labelPadding,
    y: yBottom
  }
  drawLabel(context, functionName, fileName, coords)
}

function renderAreaLabel (locals, rect, priorSiblingWidth, lineWidth, lineAlpha) {
  if (this.isAnimating) return

  const {
    context,
    node
  } = locals
  const {
    x,
    y,
    width,
    height
  } = rect
  const nodeData = node.data

  const areaX = Math.ceil(x - priorSiblingWidth) + lineWidth
  const areaWidth = Math.floor(priorSiblingWidth + width)
  const xCentre = areaX + areaWidth / 2

  const fontSize = 6 + this.zoomFactor
  const availableWidth = priorSiblingWidth + width - fontSize

  if (availableWidth < fontSize) return

  const areaName = (
    nodeData.category === 'core'
      ? 'node'
      : nodeData.category === 'all-v8'
        ? this.ui.getLabelFromKey(this.ui.dataTree.getTypeKey(nodeData))
        : nodeData.type
  ).toUpperCase()
  const nameWidth = context.measureText(areaName).width
  const visibleName = truncateFunctionName(context, availableWidth, areaName, nameWidth)
  const visibleNameWidth = context.measureText(visibleName).width
  const yBottom = y + height

  const labelRect = {
    x: xCentre - visibleNameWidth / 2,
    width: visibleNameWidth,
    y: yBottom - fontSize,
    height: fontSize
  }

  if (!visibleName) return

  context.textBaseline = 'bottom'

  context.clearRect(areaX, labelRect.y, areaWidth, labelRect.height + lineWidth)

  const foregroundColor = this.ui.getFrameColor(nodeData, 'foreground')

  context.fillStyle = foregroundColor
  context.font = `bold ${fontSize}px ${this.labelFont}`
  context.textAlign = 'center'
  context.fillText(visibleName, xCentre, yBottom - lineWidth / 2)

  const visibleParent = this.getVisibleParent(node)
  if (visibleParent && nodeData.category !== visibleParent.data.category) {
    context.save()

    context.lineWidth = lineWidth
    context.strokeStyle = foregroundColor
    context.beginPath()

    context.moveTo(areaX, yBottom)
    context.lineTo(areaX + areaWidth, yBottom)

    context.stroke()
    context.closePath()

    context.globalAlpha = lineAlpha
    context.strokeStyle = this.ui.getFrameColor(visibleParent.data, 'foreground')
    context.beginPath()

    context.moveTo(areaX, yBottom + lineWidth / 2)
    context.lineTo(areaX + areaWidth, yBottom + lineWidth / 2)

    context.stroke()
    context.closePath()
    context.restore()
  }
}

function truncateFunctionName (context, availableWidth, functionName, funcNameWidth) {
  if (availableWidth >= funcNameWidth) return functionName

  const avCharWidth = funcNameWidth / functionName.length

  // Ensure there's reasonable space for at least one character plus an ellipsis
  availableWidth -= context.measureText('…').width
  if (availableWidth <= avCharWidth) return ''

  // Estimate how much truncation is likely needed, to reduce iterations
  const chars = Math.ceil(availableWidth / avCharWidth) + 1
  if (chars < functionName.length) functionName = functionName.slice(0, chars)

  while (functionName && context.measureText(functionName).width > availableWidth) {
    functionName = functionName.slice(0, functionName.length - 1)
  }

  // Add the ellipsis only if there's still at least one character
  return functionName ? functionName + '…' : ''
}

function truncateFileName (context, availableWidth, fileName, pathSeparator, nodeData) {
  if (nodeData.category === 'deps') {
    const removedDep = fileName.replace(new RegExp(`^${nodeData.type}[\\\\/]`), '…')
    if (context.measureText(removedDep).width <= availableWidth) return removedDep
  }

  let fileOnly = fileName.split(pathSeparator).pop()

  if (fileOnly === fileName) return ''

  fileOnly = '…' + fileOnly
  const fileOnlyWidth = context.measureText(fileOnly).width
  return fileOnlyWidth > availableWidth ? '' : fileOnly
}

function drawLabel (context, functionName, fileName, coords) {
  context.textAlign = 'left'
  context.fillText(functionName, coords.leftX, coords.y)

  if (fileName) {
    context.save()
    context.textAlign = 'right'
    context.fillText(fileName, coords.rightX, coords.y)
    context.restore()
  }
}

function rootNodeLabel (context, xMid, y, availableWidth, appName) {
  context.textAlign = 'center'

  let label = 'Return to main view'
  const labelWidth = context.measureText(label).width

  if (labelWidth > availableWidth) label = truncateFunctionName(context, availableWidth, label, labelWidth)

  context.fillText(label, xMid, y)
  context.restore()
}

module.exports = { getFrameLabeler, getAreaLabeler }
