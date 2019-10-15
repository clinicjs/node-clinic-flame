'use strict'
const HtmlContent = require('./html-content.js')
const getNoDataNode = require('./no-data-node.js')

const stripTags = html => html.replace(/(<([^>]+)>)/ig, '')

const addResponsiveSpan = str => `<span class="visible-md">${str}</span>`

class InfoBox extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    const {
      functionName,
      fileName
    } = getNoDataNode()

    this.functionText = functionName
    this.pathHtml = fileName
    this.areaHtml = 'Processing data...'
    this.stackPercentages = {
      top: 0,
      overall: 0
    }
  }

  initializeElements () {
    super.initializeElements()

    // Initialize frame info
    this.d3FrameInfo = this.d3Element.append('div')
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
    this.pathHtml = ''

    if (node.fileName) {
      const fileNameParts = (node.fileName || '').split('/')
      const baseName = fileNameParts.pop()
      const prefix = fileNameParts.join('/')

      this.pathHtml = `${addResponsiveSpan(`${prefix}/`)}${baseName}`
    }

    if (node.lineNumber && node.columnNumber) {
      // Two spaces (in <pre> tag) so this is visually linked to but distinct from main path, including when wrapped
      this.pathHtml += `<span class="frame-line-col">${addResponsiveSpan('  line')}:${node.lineNumber}${addResponsiveSpan(' column')}:${node.columnNumber}</span>`
    }

    this.rankNumber = this.ui.dataTree.getSortPosition(node)

    let typeLabel = `(${this.ui.getLabelFromKey(`${node.category}:${node.type}`, true)})`
    let categoryLabel = this.ui.getLabelFromKey(node.category, true)

    if (node.type === 'core') {
      typeLabel = categoryLabel
      categoryLabel = ''
    } else {
      categoryLabel = `${categoryLabel} `
    }

    this.areaHtmlColour = this.ui.getFrameColor(
      {
        category: node.category
      },
      'foreground',
      false
    )

    // e.g. The no-data-node has an .areaText containing a custom message
    this.areaHtml = node.areaText || `${addResponsiveSpan(`In ${categoryLabel}`)}${typeLabel}`

    if (node.isInit) this.areaHtml += '. In initialization process'
    if (node.isInlinable) this.areaHtml += '. Inlinable'
    if (node.isUnoptimized) this.areaHtml += '. Unoptimized'
    if (node.isOptimized) this.areaHtml += '. Optimized'

    this.areaHtml += addResponsiveSpan('.')

    this.draw()
  }

  showNodeInfo (node) {
    this.contentFromNode(node)
  }

  draw () {
    super.draw()

    this.d3FrameFunction
      .text(this.functionText)
      .attr('title', this.functionText)

    this.d3FramePath
      .html(this.pathHtml)
      .attr('title', stripTags(this.pathHtml))

    this.d3FrameArea
      .html(this.areaHtml)
      .attr('title', stripTags(this.areaHtml))
      .style('color', this.areaHtmlColour)

    this.d3CollapseButton
      .select('span')
      .text(`${this.stackPercentages.top}%`)

    this.d3StackPercentageTop
      .text(`Top of stack: ${this.stackPercentages.top}%`)

    this.d3StackPercentageOverall
      .text(`On stack: ${this.stackPercentages.overall}%`)
  }
}

module.exports = InfoBox
