'use strict'

const HtmlContent = require('./html-content.js')

class Tooltip extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, Object.assign({ hidden: true }, contentProperties))

    this.tooltipHandler = null
    this.showDelay = contentProperties.showDelay || 1500
    this.hideDelay = contentProperties.hideDelay || 200

    this.onHideCallback = null

    this.contentProperties = contentProperties
  }

  initializeElements () {
    super.initializeElements()

    // creating the tooltip component
    this.d3Tooltip = this.d3Element
      .classed('tooltip', true)

    this.d3TooltipInner = this.d3Tooltip.append('div')
      .classed('tooltip-inner', true)

    // handling the mouse events
    this.d3Tooltip.on('mouseover', () => {
      clearTimeout(this.tooltipHandler)
    })

    this.d3Tooltip.on('mouseout', (e) => {
      this.tooltipHandler && this.hide()
    })
  }

  attach (options) {
    options.d3TargetElement
      .on('mouseover.tooltip', () => this.show(options))
      .on('mouseout.tooltip', () => this.hide(options))

      // replicating the default tooltip behaviour
      .on('click.tooltip', () => this.hide(options))
  }

  show ({ msg, d3TargetElement, targetRect, outerRect = document.body.getBoundingClientRect(), offset, pointerCoords, showDelay = this.showDelay, verticalAlign = 'bottom' }) {
    // adding the delay if no tooltip is already displayed, or a shorter delay
    // if the tooltip is already there
    const delay = this.nodeData === null ? showDelay : showDelay / 2
    let msgHtmlNode = msg

    this.d3TooltipInner.classed('top bottom', false)
    this.d3TooltipInner.classed(verticalAlign, true)

    let innerRect = targetRect || d3TargetElement.node().getBoundingClientRect()

    if (offset) {
      innerRect.x += offset.x || 0
      innerRect.y += offset.y || 0
      innerRect.width += offset.width || 0
      innerRect.height += offset.height || 0
    }

    if (typeof (msg) === 'string') {
      var node = document.createElement('DIV')
      node.className = 'tooltip-default-message'
      node.textContent = msg
      msgHtmlNode = node
    }

    clearTimeout(this.tooltipHandler)

    this.tooltipHandler = setTimeout(
      () => {
        let ttLeft = innerRect.x + innerRect.width / 2
        let ttTop = innerRect.y + (verticalAlign === 'bottom' ? innerRect.height : 0)

        if (pointerCoords) {
          // centering on the mouse pointer horizontally
          ttLeft = innerRect.x + pointerCoords.x
        }

        this.d3Tooltip
          .style('left', `${ttLeft}px`)
          .style('top', `${ttTop}px`)

        this.d3TooltipInner.selectAll(function () { return this.childNodes })
          .remove()
        this.d3TooltipInner.append(() => msgHtmlNode)

        this.isHidden = false
        this.draw()

        // calculating the actual tooltip width
        const ttWidth = this.d3TooltipInner.node().getBoundingClientRect().width

        // positioning the tooltip content
        // making sure that it doesn't go over the frame right edge
        const alignRight = ttLeft + ttWidth - (innerRect.x + innerRect.width)
        let deltaX = Math.max(alignRight, ttWidth / 2)

        // then checking it doesn't overflow the frame left edge
        deltaX = (ttLeft - deltaX < innerRect.x) ? ttLeft - innerRect.x : deltaX

        // then checking the outer element right edge
        if (outerRect) {
          deltaX = (ttLeft - deltaX + ttWidth > outerRect.right) ? alignRight : deltaX
        }

        this.d3TooltipInner
          .style('left', `-${deltaX}px`)
          .style('max-width', outerRect ? `${outerRect.width}px` : 'auto')
      }, delay)
  }

  // If nothing is passed in, or { delay } === undefined, use default delay
  hide ({ delay = this.hideDelay, callback } = {}) {
    clearTimeout(this.tooltipHandler)

    // Callback will be called on next hide, even if this timeout cleared, e.g. moving mouse from frame to tooltip
    if (callback) this.onHideCallback = callback

    this.tooltipHandler = setTimeout(() => {
      this.isHidden = true
      this.draw()
      if (this.onHideCallback) {
        this.onHideCallback()
        this.onHideCallback = null
      }
    }, delay)
  }

  draw () {
    super.draw()
  }
}

module.exports = Tooltip
