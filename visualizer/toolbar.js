'use strict'
const HtmlContent = require('./html-content.js')

class Toolbar extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)
    this.tooltip = contentProperties.customTooltip
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
      .text('Loading…') // Will be replaced when JS completes

    this.d3FramePath = this.d3FrameInfo.append('span')
      .classed('frame-info-item', true)
      .text('[file location]') // Will be replaced when JS completes

    this.d3FramePath = this.d3FrameInfo.append('span')
      .classed('frame-info-item', true)
      .text('[node.js module]') // Will be replaced when JS completes
  }
}

module.exports = Toolbar
