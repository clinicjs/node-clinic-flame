'use strict'
const HtmlContent = require('./html-content.js')
const getNoDataNode = require('./no-data-node.js')

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
    this.stackPercentages = {
      top: 0,
      overall: 0
    }
  }

  initializeElements () {
    super.initializeElements()

    // Initialize frame info
    this.d3FrameInfo = this.d3Element.append('pre')
      .classed('frame-info', true)
      .classed('panel', true)

    this.d3FrameFunction = this.d3FrameInfo.append('strong')
      .classed('frame-info-item', true)
      .classed('frame-function', true)

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

    // Todo: Use visibleRootValue when ready
    const totalValue = this.ui.dataTree.activeTree().value

    this.stackPercentages = {
      top: Math.round(100 * (node.onStackTop.asViewed / totalValue) * 10) / 10,
      overall: Math.round(100 * (node.value / totalValue) * 10) / 10
    }

    this.functionText = node.functionName

    this.pathHtml = node.fileName || ''
    if (node.lineNumber && node.columnNumber) {
      // Two spaces (in <pre> tag) so this is visually linked to but distinct from main path, including when wrapped
      this.pathHtml += `<span class="frame-line-col"><span>  line</span>:${node.lineNumber}<span> column</span>:${node.columnNumber}</span>`
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

    this.d3FrameFunction.text(this.functionText).attr('title', this.functionText)
    this.d3FramePath.html(this.pathHtml).attr('title', this.pathHtml.replace(/(<([^>]+)>)/ig, ''))
    this.d3FrameArea.text(this.areaText).attr('title', this.areaText)
  }
}

module.exports = InfoBox
