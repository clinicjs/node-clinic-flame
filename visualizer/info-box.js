'use strict'
const HtmlContent = require('./html-content.js')
const getNoDataNode = require('./no-data-node.js')
const zoomInIcon = require('@nearform/clinic-common/icons/zoom-in')
const zoomOutIcon = require('@nearform/clinic-common/icons/zoom-out')

class InfoBox extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    const {
      functionName,
      fileName
    } = getNoDataNode()

    this.functionText = functionName
    this.pathHtml = fileName
    this.areaText = 'Processing data...'
    this.node = null
    this.tooltip = contentProperties.customTooltip
  }

  initializeElements () {
    super.initializeElements()

    // Initialize frame info
    this.d3FrameInfo = this.d3Element.append('pre')
      .classed('frame-info', true)
      .classed('panel', true)

    this.d3FrameZoomButton = this.d3FrameInfo.append('button')
      .classed('frame-info-item', true)
      .classed('frame-zoom-button', true)
      .classed('frame-function', true)
      .on('click', () => {
        this.ui.zoomNode(this.node)
      })

    this.tooltip.attach({
      d3TargetElement: this.d3FrameZoomButton,
      msg: () => {
        const msgHtml = document.createElement('div')
        const fnName = `<strong>${this.node.functionName}</strong>`
        msgHtml.innerHTML = this.node === this.ui.zoomedNode ? `Zoom ${fnName} in` : `Zoom ${fnName}  out`
        return msgHtml
      }
    })

    this.d3FrameFunctionWrapper = this.d3FrameZoomButton.append('div')
      .classed('text-wrapper', true)

    this.d3FramePath = this.d3FrameInfo.append('span')
      .classed('frame-info-item', true)
      .classed('frame-path', true)

    this.d3FrameArea = this.d3FrameInfo.append('span')
      .classed('frame-info-item', true)
      .classed('frame-area', true)
  }

  contentFromNode (node) {
    if (!node) {
      console.error('`node` argument cannot be undefined/null')
      return
    }

    this.node = node

    this.functionText = node.functionName

    this.pathHtml = node.fileName
    if (node.lineNumber && node.columnNumber) {
      // Two spaces (in <pre> tag) so this is visually linked to but distinct from main path, including when wrapped
      this.pathHtml += `  <span class="frame-line-col">line:${node.lineNumber} column:${node.columnNumber}</span>`
    }

    this.rankNumber = this.ui.dataTree.getSortPosition(node)

    const typeLabel = node.category === 'core' ? '' : ` (${this.ui.getLabelFromKey(`${node.category}:${node.type}`, true)})`
    const categoryLabel = this.ui.getLabelFromKey(node.category, true)

    // e.g. The no-data-node has an .areaText containing a custom message
    this.areaText = node.areaText || `In ${categoryLabel}${typeLabel}`

    if (node.isInit) this.areaText += '. In initialization process'
    if (node.isInlinable) this.areaText += '. Inlinable'
    if (node.isUnoptimized) this.areaText += '. Unoptimized'
    if (node.isOptimized) this.areaText += '. Optimized'
    this.areaText += '.'

    this.draw()
  }

  showNodeInfo (node) {
    this.contentFromNode(node)
  }

  draw () {
    super.draw()
    const func = `<strong>${this.functionText}</strong>`
    this.d3FrameFunctionWrapper.html(this.node === this.ui.zoomedNode ? `${zoomOutIcon}${func}` : `${zoomInIcon}${func}`)
    this.d3FramePath.html(this.pathHtml)
    this.d3FrameArea.text(this.areaText)
  }
}

module.exports = InfoBox
