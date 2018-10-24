'use strict'
const HtmlContent = require('./html-content.js')

class Toolbar extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)
    this.tooltip = contentProperties.customTooltip

    this.functionText = 'Loading…'
    this.pathText = '[file location]'
    this.areaText = '[node.js module]'

    this.lastHighlightedNode = null

    this.ui.on('highlightNode', node => {
      this.highlightNode(node)
    })
  }

  initializeElements () {
    super.initializeElements()

    // Content in toolbar - full width
    this.d3UpArrow = this.d3Element.append('div')
      .classed('vertical-arrow', true)
      .classed('up-arrow', true)

    this.d3ToolbarMain = this.d3Element.append('div')
      .attr('id', 'toolbar-main')
      .classed('toolbar-section', true)

    this.d3DownArrow = this.d3ToolbarMain.append('div')
      .classed('vertical-arrow', true)
      .classed('down-arrow', true)

    // Initialize controls
    this.d3SelectionControls = this.d3ToolbarMain.append('div')
      .classed('selection-controls', true)

    this.d3SelectHottest = this.d3SelectionControls.append('button')
      .classed('hotness-selector', true)
      .text('«') // TODO: replace with proper SVG icon
      .attr('title', 'Select hottest frame')

    this.d3SelectHotter = this.d3SelectionControls.append('button')
      .classed('hotness-selector', true)
      .text('‹') // TODO: replace with proper SVG icon
      .attr('title', 'Select the frame before the selected frame when ranked from hottest to coldest')

    const d3RankWrapper = this.d3SelectionControls.append('span')
      .classed('rank-wrapper', true)
    d3RankWrapper.append('label').text('#')
    this.d3SelectNumber = d3RankWrapper.append('input')
      .classed('hotness-selector', true)
      .attr('value', 1)
    this.d3SelectedRank = d3RankWrapper.append('label').html('hottest frame, of ').append('span')
      .text('…') // Will be replaced when JS completes

    this.d3SelectCooler = this.d3SelectionControls.append('button')
      .classed('hotness-selector', true)
      .text('Next hottest ›') // TODO: replace unicode char with proper SVG icon
      .on('mouseover', () => {
        const config = {
          msg: 'Select the frame after the selected frame when ranked from hottest to coldest',
          d3TargetElement: this.d3SelectCooler,
          offset: {
            y: -3
          }
        }
        this.tooltip.show(config)
      })
      .on('mouseout', () => {
        this.tooltip.hide()
      })
    this.d3SelectColdest = this.d3SelectionControls.append('button')
      .classed('hotness-selector', true)
      .text('»') // TODO: replace with proper SVG icon
      .attr('title', 'Select the frame after the selected frame when ranked from hottest to coldest')

    // Initialize frame info
    this.d3FrameInfo = this.d3ToolbarMain.append('pre')
      .classed('frame-info', true)
      .classed('panel', true)

    this.d3FrameFunction = this.d3FrameInfo.append('strong')
      .classed('frame-info-item', true)

    this.d3FramePath = this.d3FrameInfo.append('span')
      .classed('frame-info-item', true)

    this.d3FrameArea = this.d3FrameInfo.append('em')
      .classed('frame-info-item', true)
  }

  highlightNode (node) {
    if (!node || node === this.lastHighlightedNode) return
    this.functionText = node.functionName
    this.pathText = node.fileName

    // 'typeTEMP' key is temporary until d3-fg custom filter is complete
    const typeLabel = this.ui.getLabelFromKey(node.typeTEMP || node.type, true)
    const categoryLabel = this.ui.getLabelFromKey(node.category, true)
    this.areaText = `In ${categoryLabel} (${typeLabel})`

    this.lastHighlightedNode = node
    this.draw()
  }

  draw () {
    super.draw()
    this.d3FrameFunction.text(this.functionText)
    this.d3FramePath.text(this.pathText)
    this.d3FrameArea.text(this.areaText)
  }
}

module.exports = Toolbar
