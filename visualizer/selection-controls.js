'use strict'

const HtmlContent = require('./html-content.js')
const chevronLeftFirst = require('@nearform/clinic-common/icons/chevron-left-first')
const chevronLeft = require('@nearform/clinic-common/icons/chevron-left')
const chevronRight = require('@nearform/clinic-common/icons/chevron-right')
const chevronRightLast = require('@nearform/clinic-common/icons/chevron-right-last')
const gridIcon = require('@nearform/clinic-common/icons/grid-view')
const OccurrencesToolTip = require('./occurrences-tooltip.js')

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

    this.ui.on('showOccurrences', () => this.draw())
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

    const node = this.ui.highlightedNode || this.ui.selectedNode

    if (node) {
      const occurrences = [node, ...this.ui.selectOtherOccurrences(node)]
      const totalValue = this.ui.dataTree.activeTree().value

      const perc = occurrences.reduce((acc, curr) => acc + curr.onStackTop.asViewed, 0)

      this.d3OccurrencesCount
        .classed('on', this.ui.showOccurrences)
        .html(`
        ${gridIcon}
        <span class='count'>${occurrences.length}</span>
        <span class='perc'>${Math.round(100 * (perc / totalValue) * 10) / 10}%</span>
      `)
    }
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

    // occurrences count
    this.d3OccurrencesCount = this.d3Element.append('button')
      .classed('occurrences-count', true)
      .html(`...`)

    const occurrencesTooltipObj = {
      msg: () => {
        const div = document.createElement('div')
        div.addEventListener('mouseover', (e) => {
          this.ui.selectedNodeOtherOccurrences.forEach(n => {
            if (parseInt(e.target.dataset.id) === n.id) {
              this.ui.highlightNode(n)
            }
          })
        })

        div.addEventListener('click', (e) => {
          this.ui.selectedNodeOtherOccurrences.forEach(n => {
            if (parseInt(e.target.dataset.id) === n.id) {
              this.ui.selectNode(n)
              this.tooltip.hide({ hideDelay: 0 })
            }
          })
        })
        const totalValue = this.ui.dataTree.activeTree().value

        div.innerHTML = OccurrencesToolTip.getHtml({
          occurrences: this.ui.selectedNodeOtherOccurrences,
          isVisible: this.ui.showOccurrences,
          totalValue,
          getHeatColor: this.ui.dataTree.getHeatColor.bind(this.ui.dataTree)
        })

        return div
      },
      d3TargetElement: this.d3OccurrencesCount,
      showDelay: 0,
      hideDelay: 0,
      offset: { y: 1 }
    }

    this.d3OccurrencesCount
      .on('click', () => {
        this.ui.setOccurrencesVisibility(!this.ui.showOccurrences)
        this.tooltip.show(occurrencesTooltipObj)
      })
      .on('mouseenter', () => this.tooltip.show(
        {
          ...occurrencesTooltipObj,
          showDelay: this.ui.showOccurrences ? 400 : 1500
        })
      )
      .on('mouseleave', () => {
        this.tooltip.hide({ hideDelay: 300, callback: () => this.ui.highlightNode(this.ui.selectedNode) })
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
