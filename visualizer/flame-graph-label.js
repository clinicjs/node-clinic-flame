'use strict'

function getLabelRenderer (bindTo) {
  return renderLabel.bind(bindTo)
}

function renderLabel (frameHeight, options) {
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

  // TODO - from d3-fg, integrate / replace this with code adapting sizes to viewport
  const fontSize = Math.floor(12 + (frameHeight - 18) * 0.3)
  const btmOffset = Math.floor((frameHeight - 16) / 2)
  const yBottom = y + frameHeight - btmOffset

  context.font = `${fontSize}px ${this.labelFont}`
  context.fillStyle = this.ui.exposedCSS[nodeData.category]

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

  if (fileName === null) {
    if (nodeData.type === 'v8') fileName = 'Compiled V8 C++'
    if (nodeData.type === 'cpp') fileName = 'Compiled C++'
  }

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

      fileName = extraTextWidth < width ? nodeData.fileName + lineAndColumn : nodeData.fileName
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
    fileName = truncateFileName(context, availableWidth, fileName, pathSeparator)
  }

  const coords = {
    leftX: x + this.labelPadding,
    rightX: x + width - this.labelPadding,
    y: yBottom
  }
  drawLabel(context, functionName, fileName, coords)
}

function truncateFunctionName (context, availableWidth, functionName, funcNameWidth) {
  const avCharWidth = funcNameWidth / functionName.length

  // Ensure there's reasonable space for at least one character plus an ellipsis
  availableWidth -= context.measureText('…').width
  if (availableWidth <= avCharWidth) return ''

  // Estimate how much truncation is likely needed, to reduce iterations
  let chars = Math.ceil(availableWidth / avCharWidth) + 1
  if (chars < functionName.length) functionName = functionName.slice(0, chars)

  while (functionName && context.measureText(functionName).width > availableWidth) {
    functionName = functionName.slice(0, functionName.length - 1)
  }

  // Add the ellipsis only if there's still at least one character
  return functionName ? functionName + '…' : ''
}

function truncateFileName (context, availableWidth, fileName, pathSeparator) {
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
  }
  context.restore()
}

function rootNodeLabel (context, xMid, y, availableWidth, appName) {
  context.textAlign = 'center'

  let label = 'Return to main view'
  const labelWidth = context.measureText(label).width

  if (labelWidth > availableWidth) label = truncateFunctionName(context, availableWidth, label, labelWidth)

  context.fillText(label, xMid, y)
  context.restore()
}

module.exports = getLabelRenderer
