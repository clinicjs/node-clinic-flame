'use strict'
const d3 = require('./d3.js')

class FgTooltipContainer {
  constructor ({ tooltip, tooltipHtmlContent, showDelay = 700, hideDelay = 200 }) {
    this.tooltip = tooltip
    this.ui = tooltip.ui

    this.tooltipHandler = null
    this.tooltipHtmlContent = tooltipHtmlContent

    this.d3TooltipHtml = tooltipHtmlContent.getTooltipD3()

    this.d3HiddenDiv = d3.select('body').select('.tooltipHiddenDiv', ':first-child')

    this.showDelay = showDelay
    this.hideDelay = hideDelay

    this.nodeData = null
    this.frameIsZoomed = false
  }

  show ({ nodeData, rect, pointerCoords, frameIsZoomed, wrapperNode, delay = null }) {
    // handling the timeout here because these calculations need to happen only when the tooltip gets actually displayed
    clearTimeout(this.tooltipHandler)

    // Cancel any pending highlight clearing callback e.g. from recent mouseout events
    this.tooltip.onHideCallback = null

    this.nodeData = nodeData

    this.tooltipHandler = setTimeout(() => {
      this.frameIsZoomed = frameIsZoomed

      const wrapperRect = wrapperNode.getBoundingClientRect()

      const offset = {
        x: wrapperRect.x - wrapperNode.scrollLeft,
        y: wrapperRect.y - wrapperNode.scrollTop - rect.height
      }

      // moving the tooltip html into the hidden div to get its size
      this.d3HiddenDiv.append(() => {
        const node = this.d3TooltipHtml.remove().node()
        return node
      })

      this.tooltipHtmlContent.setNodeData(this.nodeData)

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
}

module.exports = FgTooltipContainer
