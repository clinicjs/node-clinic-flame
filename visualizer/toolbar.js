'use strict'
const HtmlContent = require('./html-content.js')

class Toolbar extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)
    this.tooltip = contentProperties.customTooltip

    this.functionText = 'Loading…'
    this.pathText = '[file location]'
    this.areaText = '[node.js module]'
    this.rankNumber = 0
    this.framesCount = '…'

    this.lastHighlightedNode = null

    this.ui.on('highlightNode', node => {
      if (node) this.highlightNode(node)
    })
    this.ui.on('updateExclusions', () => {
      this.countFrames()
    })
  }

  initializeElements () {
    super.initializeElements()

    // Content in toolbar - full width
    this.d3ToolbarMain = this.d3Element.append('div')
      .attr('id', 'toolbar-main')
      .classed('toolbar-section', true)

    // Initialize controls
    this.d3SelectionControls = this.d3ToolbarMain.append('div')
      .classed('selection-controls', true)

    this.d3SelectHottest = this.d3SelectionControls.append('button')
      .classed('hotness-selector', true)
      .text('«') // TODO: replace with proper SVG icon
      .on('mouseover', () => {
        this.showButtonTooltip('Select the hottest frame (meaning, most time at the top of the stack)', this.d3SelectHottest)
      })
      .on('mouseout', () => {
        this.hideButtonTooltip()
      })
      .on('click', () => {
        this.selectByRank(0)
      })

    this.d3SelectHotter = this.d3SelectionControls.append('button')
      .classed('hotness-selector', true)
      .text('‹') // TODO: replace with proper SVG icon
      .on('mouseover', () => {
        this.showButtonTooltip('Select the frame before the selected frame when ranked from hottest to coldest', this.d3SelectHotter)
      })
      .on('mouseout', () => {
        this.hideButtonTooltip()
      })
      .on('click', () => {
        this.selectByRank(this.rankNumber - 1)
      })

    const d3RankWrapper = this.d3SelectionControls.append('span')
      .classed('rank-wrapper', true)
    d3RankWrapper.append('label').text('#')

    this.d3SelectNumber = d3RankWrapper.append('input')
      .classed('hotness-selector', true)
      .property('value', this.rankNumber)

    this.d3FramesCount = d3RankWrapper.append('label').html('hottest frame, of ').append('span')

    this.d3SelectCooler = this.d3SelectionControls.append('button')
      .classed('hotness-selector', true)
      .text('Next hottest ›') // TODO: replace unicode char with proper SVG icon
      .on('click', () => {
        this.selectByRank(this.rankNumber + 1)
      })

    this.tooltip.attach({
      msg: 'Select the frame after the selected frame when ranked from hottest to coldest',
      d3TargetElement: this.d3SelectCooler,
      offset: {
        y: 2
      }
    })

    this.d3SelectColdest = this.d3SelectionControls.append('button')
      .classed('hotness-selector', true)
      .text('»') // TODO: replace with proper SVG icon
      .on('mouseover', () => {
        this.showButtonTooltip('Select the coldest frame (meaning, least time at the top of the stack)', this.d3SelectColdest)
      })
      .on('mouseout', () => {
        this.hideButtonTooltip()
      })
      .on('click', () => {
        this.selectByRank('last')
      })

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

  showButtonTooltip (msg, d3TargetElement) {
    const config = {
      msg,
      d3TargetElement,
      offset: {
        y: -3
      }
    }
    this.tooltip.show(config)
  }

  hideButtonTooltip () {
    if (this.tooltip) this.tooltip.hide()
  }

  highlightNode (node) {
    if (!node || node === this.lastHighlightedNode) return
    this.functionText = node.functionName
    this.pathText = node.fileName
    this.rankNumber = this.ui.dataTree.getSortPosition(node)

    // 'typeTEMP' key is temporary until d3-fg custom filter is complete
    const typeLabel = this.ui.getLabelFromKey(node.typeTEMP || node.type, true)
    const categoryLabel = this.ui.getLabelFromKey(node.category, true)
    this.areaText = `In ${categoryLabel} (${typeLabel})`

    this.lastHighlightedNode = node
    this.draw()
  }

  selectByRank (rank) {
    if (rank === 'last') {
      if (typeof this.framesCount !== 'number' || !this.framesCount) return
      this.ui.selectNode(this.ui.dataTree.getFrameByRank(this.framesCount - 1))
    }
    this.ui.selectNode(this.ui.dataTree.getFrameByRank(rank))
  }

  countFrames () {
    this.framesCount = this.ui.dataTree.countFrames()
  }

  draw () {
    super.draw()

    this.d3FramesCount.text(this.framesCount)
    this.d3FrameFunction.text(this.functionText)
    this.d3FramePath.text(this.pathText)
    this.d3FrameArea.text(this.areaText)
    this.d3SelectNumber.property('value', this.rankNumber + 1)

    const isHottest = this.rankNumber === 0
    this.d3SelectHotter.attr('disabled', isHottest || null)
    this.d3SelectHottest.attr('disabled', isHottest || null)

    const isColdest = this.rankNumber === this.framesCount - 1
    this.d3SelectCooler.attr('disabled', isColdest || null)
    this.d3SelectColdest.attr('disabled', isColdest || null)
  }
}

module.exports = Toolbar
