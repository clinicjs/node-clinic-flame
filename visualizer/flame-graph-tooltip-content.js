'use strict'
const d3 = require('./d3.js')
const Message = require('./message.js')
const copy = require('copy-to-clipboard')
const zoomInIcon = require('@clinic/clinic-common/icons/zoom-in')
const zoomOutIcon = require('@clinic/clinic-common/icons/zoom-out')
const linkIcon = require('@clinic/clinic-common/icons/link')
const copyIcon = require('@clinic/clinic-common/icons/copy')

class FgTooltipContent {
  constructor (ui) {
    this.ui = ui
    this.tooltipHandler = null

    this.onCopyPath = (path) => {
      Message.info(`
          <span>Path copied to the clipboard!</span>
          <pre>${path}</pre>
        `, 4000)
      copy(path)
    }
    this.onOpenPath = (url) => {
      window.open(url, '_blank')
    }

    this.nodeData = null

    const html = `
      <button class='zoom-button'>
        <span class='icon'>${zoomInIcon}${zoomOutIcon}</span>
        <span class='label'>Expand</span>
      </button>
      <button class='link-button'>
        <span class='icon'>${linkIcon}</span>
        <span class='label'>Open in browser</span>
      </button>
      <button class='copy-button'>
        <span class='icon'>${copyIcon}</span>
        <span class='label'>Copy path</span>
      </button>
    `

    this.d3HiddenDiv = d3.select('body').insert('div', ':first-child')
      .classed('tooltipHiddenDiv', true)
      .style('visibility', 'hidden')
      .style('position', 'absolute')

    this.d3TooltipHtml = this.d3HiddenDiv.append('div')
      .classed('fg-tooltip-actions', true)
      .html(html)

    this.d3TooltipCopyBtn = this.d3TooltipHtml.select('.copy-button')
      .on('click', () => {
        this.onCopyPath(this.nodeData.target)
      })

    this.d3TooltipLinkBtn = this.d3TooltipHtml.select('.link-button')
      .on('click', () => {
        this.onOpenPath(this.nodeData.target)
      })

    this.d3TooltipZoomBtn = this.d3TooltipHtml.select('.zoom-button')
      .on('click', () => {
        this.ui.zoomNode(this.nodeData)
      })
  }

  setNodeData (nodeData) {
    this.nodeData = nodeData
    const isLink = /^https?:\/\//.test(this.nodeData.target)
    const frameIsZoomed = nodeData === this.ui.zoomedNode
    const hideCopyButton = !nodeData.target

    this.d3TooltipCopyBtn.classed('hidden', isLink || hideCopyButton)
    this.d3TooltipLinkBtn.classed('hidden', !isLink)

    this.d3TooltipZoomBtn.select('.label').text(frameIsZoomed ? 'Contract' : 'Expand')

    this.d3TooltipZoomBtn.classed('zoom-in', !frameIsZoomed)
    this.d3TooltipZoomBtn.classed('zoom-out', frameIsZoomed)
  }

  getTooltipD3 () {
    return this.d3TooltipHtml
  }
}

module.exports = FgTooltipContent
