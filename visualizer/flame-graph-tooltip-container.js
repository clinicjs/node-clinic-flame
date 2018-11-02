'use strict'
const d3 = require('d3')

class FgTooltipContainer {
  constructor ({ tooltip, showDelay = 700, hideDelay = 200, onCopyPath, onOpenPath }) {
    this.tooltip = tooltip
    this.ui = tooltip.ui

    this.tooltipHandler = null

    this.showDelay = showDelay
    this.hideDelay = hideDelay
    this.onCopyPath = onCopyPath
    this.onOpenPath = onOpenPath

    this.nodeData = null
    this.frameIsZoomed = false

    this.svgPath = '/visualizer/assets/icons/'

    const html = `
    <button class='zoom-button'>
      <span class='icon'><img data-inline-svg class="icon-img zoom-in" src="/visualizer/assets/icons/zoom-in.svg" /><img data-inline-svg class="icon-img zoom-out" src="/visualizer/assets/icons/zoom-out.svg" /></span>
      <span class='label'>Expand</span>
    </button>
    <button class='link-button'>
      <span class='icon'><img data-inline-svg class="icon-img" src="/visualizer/assets/icons/link.svg" /></span>
      <span>Open</span>
      <span style="white-space: nowrap">in browser</span>
    </button>
    <button class='copy-button'>
      <span class='icon'><img data-inline-svg class="icon-img" src="/visualizer/assets/icons/copy.svg" /></span>
      <span>Copy</span>
      <span>path</span>
    </button>
  `
    this.d3HiddenDiv = d3.select('body').insert('div', ':first-child')
      .style('visibility', 'hidden')
      .style('position', 'absolute')

    this.d3TooltipHtml = this.d3HiddenDiv.append('div')
      .classed('fg-tooltip-actions', true)
      .html(html)

    this.d3TooltipCopyBtn = this.d3TooltipHtml.select('.copy-button')
      .on('click', () => {
        this.onCopyPath && this.onCopyPath(this.nodeData.target)
      })

    this.d3TooltipLinkBtn = this.d3TooltipHtml.select('.link-button')
      .on('click', () => {
        this.onOpenPath && this.onOpenPath(this.nodeData.target)
      })

    this.d3TooltipZoomBtn = this.d3TooltipHtml.select('.zoom-button')
      .on('click', () => {
        this.ui.zoomNode(this.nodeData)
      })

    this.copyBtnChildren = this.d3TooltipCopyBtn.selectAll('span')
    this.zoomBtnChildren = this.d3TooltipZoomBtn.selectAll('span')
  }

  show ({ nodeData, rect, pointerCoords, frameIsZoomed, wrapperNode, delay = null }) {
    // handling the timeout here because these calculations need to happen only when the tooltip gets actually displayed
    clearTimeout(this.tooltipHandler)

    // Cancel any pending highlight clearing callback e.g. from recent mouseout events
    this.tooltip.onHideCallback = null

    this.nodeData = nodeData

    this.tooltipHandler = setTimeout(() => {
      this.frameIsZoomed = frameIsZoomed

      const hideCopyButton = !nodeData.target

      const wrapperRect = wrapperNode.getBoundingClientRect()

      const offset = {
        x: wrapperRect.x - wrapperNode.scrollLeft,
        y: wrapperRect.y - wrapperNode.scrollTop - rect.height
      }

      // moving the tooltip html into the hidden div to get its size
      this.d3HiddenDiv.append(() => {
        return this.d3TooltipHtml.remove().node()
      })

      this.d3TooltipCopyBtn.classed('hidden', hideCopyButton)

      this.updateZoomBtnLabel()

      const pointerPosition = {
        x: pointerCoords.x - rect.x,
        y: pointerCoords.y - rect.y
      }

      this.tooltip.show({
        msg: this.d3TooltipHtml.node(),
        targetRect: rect,
        offset,
        pointerCoords: pointerPosition,
        outerRect: wrapperRect,
        showDelay: 0,
        verticalAlign: 'bottom'
      })
    }, typeof delay === 'number' ? delay : this.showDelay)
  }

  hide (args = {}) {
    clearTimeout(this.tooltipHandler)

    this.tooltip.hide(Object.assign({
      callback: () => {
        if (this.nodeData === this.ui.highlightedNode) this.ui.highlightNode(null)
      }
    }, args))
  }

  updateZoomBtnLabel () {
    const isLink = /^https?:\/\//.test(this.nodeData.target)
    this.d3TooltipCopyBtn.classed('hidden', isLink)
    this.d3TooltipLinkBtn.classed('hidden', !isLink)

    this.d3TooltipZoomBtn.select('.label').text(this.frameIsZoomed ? 'Contract' : 'Expand')

    this.d3TooltipZoomBtn.classed('zoom-in', !this.frameIsZoomed)
    this.d3TooltipZoomBtn.classed('zoom-out', this.frameIsZoomed)
  }
}

module.exports = FgTooltipContainer
