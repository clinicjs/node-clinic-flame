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

  show (props) {
    const baseDelay = props.showDelay === undefined ? this.showDelay : props.showDelay
    // adding the delay if no tooltip is already displayed, or a shorter delay
    // if the tooltip is already there
    const delay = this.isHidden ? baseDelay : baseDelay / 2

    clearTimeout(this.tooltipHandler)

    this.updateTooltip(props)

    this.tooltipHandler = setTimeout(() => {
      this.isHidden = false
      this.draw()

      this.updateTooltip(props)
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

  toggle (props, show = !this.isHidden) {
    if (show) {
      this.show(props)
    } else {
      this.hide(props)
    }
  }

  updateTooltip ({ msg, d3TargetElement, targetRect, outerRect = document.body.getBoundingClientRect(), offset, pointerCoords, verticalAlign = 'bottom' }) {
    // returns if the tooltip is hidden
    if (this.isHidden) return

    const msgHtmlNode = getMsgHtml(msg)

    this.d3TooltipInner.classed('top bottom', false)
    this.d3TooltipInner.classed(verticalAlign, true)

    let {
      x,
      y,
      width,
      height
    } = targetRect || d3TargetElement.node().getBoundingClientRect()

    if (offset) {
      x += offset.x || 0
      y += offset.y || 0
      width += offset.width || 0
      height += offset.height || 0
    }

    clearTimeout(this.tooltipHandler)

    let ttLeft = x + width / 2
    const ttTop = y + (verticalAlign === 'bottom' ? height : 0)

    if (pointerCoords) {
      // centering on the mouse pointer horizontally
      ttLeft = x + pointerCoords.x
    }

    this.d3Tooltip
      .style('left', `${ttLeft}px`)
      .style('top', `${ttTop}px`)

    this.d3TooltipInner.selectAll(function () { return this.childNodes })
      .remove()
    this.d3TooltipInner.append(() => msgHtmlNode)

    // calculating the actual tooltip width
    const ttWidth = this.d3TooltipInner.node().getBoundingClientRect().width

    // positioning the tooltip content
    // making sure that it doesn't go over the frame right edge
    const alignRight = ttLeft + ttWidth - (x + width)
    let deltaX = Math.max(alignRight, ttWidth / 2)

    // then checking it doesn't overflow the frame left edge
    deltaX = (ttLeft - deltaX < x) ? ttLeft - x : deltaX

    // then checking the outer element right edge
    if (outerRect) {
      deltaX = (ttLeft - deltaX + ttWidth > outerRect.right) ? alignRight : deltaX
    }

    this.d3TooltipInner
      .style('left', `-${deltaX}px`)
      .style('max-width', outerRect ? `${outerRect.width}px` : 'auto')
  }

  draw () {
    super.draw()
  }
}

function getMsgHtml (msg) {
  switch (typeof msg) {
    case 'string':
      var node = document.createElement('DIV')
      node.className = 'tooltip-default-message'
      node.textContent = msg
      return node

    case 'function':
      return getMsgHtml(msg())

    case 'object':
      if (msg.nodeType === 1) {
        // it is an HTMLElement
        if (msg.classList.length === 0) {
          msg.className = 'tooltip-default-message'
        }
        return msg
      }
  }

  throw new TypeError('The provided content is not a String nor an HTMLElement ')
}

module.exports = Tooltip
