'use strict'

const HtmlContent = require('./html-content.js')
const chevronLeftFirst = require('@nearform/clinic-common/icons/chevron-left-first')
const chevronLeft = require('@nearform/clinic-common/icons/chevron-left')
const chevronRight = require('@nearform/clinic-common/icons/chevron-right')
const chevronRightLast = require('@nearform/clinic-common/icons/chevron-right-last')

class SelectionControls extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)
    this.tooltip = contentProperties.customTooltip

    this.rankNumber = 0
    this.framesCount = '…'

    this.selectedNode = null

    // Show content for highlightedNode, or selectedNode when nothing is highlighted
    // so content falls back to most recent selection on frame mouseout etc
    this.ui.on('updateExclusions', () => {
      this.update()
    })

    this.ui.on('zoomNode', () => {
      this.update()
    })

    this.ui.on('setData', () => {
      this.countFrames()
    })

    this.ui.on('selectNode', node => {
      if (!node) return
      this.selectedNode = node
      this.rankNumber = this.ui.dataTree.getSortPosition(node)
      this.draw()
    })

    this.ui.on('highlightNode', node => {
      if (!node && !this.selectedNode) return
      this.rankNumber = this.ui.dataTree.getSortPosition(node || this.selectedNode)
      this.draw()
    })
  }

  update () {
    this.countFrames()
    const node = this.ui.highlightedNode || this.ui.selectedNode
    this.rankNumber = this.ui.dataTree.getSortPosition(node)
    this.draw()
  }

  draw () {
    super.draw()

    this.d3FramesCount.html(`<span class="visible-from-bp-1">of ${this.framesCount}</span>`)
    this.d3SelectNumber.property('value', this.rankNumber + 1)

    const isHottest = this.rankNumber === 0
    this.d3SelectHotter.attr('disabled', isHottest || null)
    this.d3SelectHottest.attr('disabled', isHottest || null)

    const isColdest = this.rankNumber === this.framesCount - 1
    this.d3SelectCooler.attr('disabled', isColdest || null)
    this.d3SelectColdest.attr('disabled', isColdest || null)
  }

  initializeElements () {
    super.initializeElements()

    // Initialize controls
    this.d3SelectHottest = this.d3Element.append('button')
      .classed('hotness-selector', true)
      .html(`${chevronLeftFirst}`)
      .on('click', () => {
        this.selectByRank(0)
      })

    this.tooltip.attach({
      msg: 'Select the hottest frame (meaning, most time at the top of the stack)',
      d3TargetElement: this.d3SelectHottest,
      offset: {
        y: 2
      }
    })

    this.d3SelectHotter = this.d3Element.append('button')
      .classed('hotness-selector', true)
      .html(`${chevronLeft}`)
      .on('click', () => {
        this.selectByRank(this.rankNumber - 1)
      })

    this.tooltip.attach({
      msg: 'Select the frame before the selected frame when ranked from hottest to coldest',
      d3TargetElement: this.d3SelectHotter,
      offset: {
        y: 2
      }
    })

    const d3RankWrapper = this.d3Element.append('span')
      .classed('rank-wrapper', true)
    d3RankWrapper.append('label').text('#')

    this.d3SelectNumber = d3RankWrapper.append('input')
      .classed('hotness-selector', true)
      .property('value', this.rankNumber)

    this.d3FramesCount = d3RankWrapper.append('label').html('<span class="visible-from-bp-2">hottest frame, </span> ').append('span')

    this.d3SelectCooler = this.d3Element.append('button')
      .classed('hotness-selector next-btn', true)
      .html(`<span class="visible-from-bp-2">Next hottest</span>${chevronRight}`)
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

    this.d3SelectColdest = this.d3Element.append('button')
      .classed('hotness-selector', true)
      .html(`${chevronRightLast}`)
      .on('click', () => {
        this.selectByRank('last')
      })

    this.tooltip.attach({
      msg: 'Select the coldest frame (meaning, least time at the top of the stack)',
      d3TargetElement: this.d3SelectColdest,
      offset: {
        y: 2
      }
    })
  }

  selectByRank (rank) {
    if (rank === 'last') {
      if (typeof this.framesCount !== 'number' || !this.framesCount) return
      this.ui.selectNode(this.ui.dataTree.getFrameByRank(this.framesCount - 1))
      return
    }
    this.ui.selectNode(this.ui.dataTree.getFrameByRank(rank))
  }

  countFrames () {
    this.framesCount = this.ui.dataTree.countFrames()
  }
}

module.exports = SelectionControls
