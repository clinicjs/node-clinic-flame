'use strict'

const HtmlContent = require('./html-content.js')
const chevronLeftFirst = require('@clinic/clinic-common/icons/chevron-left-first')
const chevronLeft = require('@clinic/clinic-common/icons/chevron-left')
const chevronRight = require('@clinic/clinic-common/icons/chevron-right')
const chevronRightLast = require('@clinic/clinic-common/icons/chevron-right-last')

const button = require('@clinic/clinic-common/base/button.js')

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

    const noNodes = this.ui.selectedNode && this.ui.selectedNode.type === 'no-data'

    this.d3FramesCount.html(`<span class="visible-from-bp-1">of ${noNodes ? 0 : this.framesCount}</span>`)
    this.d3SelectNumber.property('value', noNodes ? 0 : this.rankNumber + 1)

    const isHottest = this.rankNumber === 0
    this.d3SelectHotter.attr('disabled', noNodes || isHottest || null)
    this.d3SelectHottest.attr('disabled', noNodes || isHottest || null)

    const isColdest = this.rankNumber === this.framesCount - 1
    this.d3SelectCooler.attr('disabled', noNodes || isColdest || null)
    this.d3SelectColdest.attr('disabled', noNodes || isColdest || null)
  }

  initializeElements () {
    super.initializeElements()

    // Initialize controls

    this.d3SelectHottest = this.d3Element.append(() => button({
      rightIcon: chevronLeftFirst,
      classNames: ['hotness-selector'],
      onClick: () => this.selectByRank(0)
    }))
    this.tooltip.attach({
      msg: 'Select the hottest frame (meaning, most time at the top of the stack)',
      d3TargetElement: this.d3SelectHottest,
      offset: {
        y: 2
      }
    })

    this.d3SelectHotter = this.d3Element.append(() => button({
      rightIcon: chevronLeft,
      classNames: ['hotness-selector'],
      onClick: () => this.selectByRank(this.rankNumber - 1)
    }))
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
      .classed('hotness-selector button', true)
      .property('value', this.rankNumber)

    this.d3FramesCount = d3RankWrapper.append('label').html('<span class="visible-from-bp-2">hottest frame, </span> ').append('span')

    this.d3SelectCooler = this.d3Element.append(() => button({
      rightIcon: chevronRight,
      label: 'Next hottest',
      classNames: ['hotness-selector', 'visible-from-bp-2'],
      onClick: () => this.selectByRank(this.rankNumber + 1)
    }))
    this.tooltip.attach({
      msg: 'Select the frame after the selected frame when ranked from hottest to coldest',
      d3TargetElement: this.d3SelectCooler,
      offset: {
        y: 2
      }
    })

    this.d3SelectColdest = this.d3Element.append(() => button({
      rightIcon: chevronRightLast,
      classNames: ['hotness-selector'],
      onClick: () => this.selectByRank('last')
    }))
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
