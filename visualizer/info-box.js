'use strict'
const HtmlContent = require('./html-content.js')

class InfoBox extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.functionText = 'Loading…'
    this.pathText = '[file location]'
    this.areaText = '[node.js module]'
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

    this.functionText = node.functionName
    this.pathText = node.fileName
    this.rankNumber = this.ui.dataTree.getSortPosition(node)

    const typeLabel = node.category === 'core' ? '' : ` (${this.ui.getLabelFromKey(`${node.category}:${node.type}`, true)})`
    const categoryLabel = this.ui.getLabelFromKey(node.category, true)
    this.areaText = `In ${categoryLabel}${typeLabel}`

    if (node.isInit) this.areaText += '. In initialization process'
    if (node.isInlinable) this.areaText += '. Inlinable'
    if (node.isOptimisable) this.areaText += '. Optimizable'
    if (node.isOptimised) this.areaText += '. Is optimized'
    this.areaText += '.'

    this.draw()
  }

  showNodeInfo (node) {
    this.contentFromNode(node)
  }

  draw () {
    super.draw()

    this.d3FrameFunction.text(this.functionText)
    this.d3FramePath.text(this.pathText)
    this.d3FrameArea.text(this.areaText)
  }
}

module.exports = InfoBox
