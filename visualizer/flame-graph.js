'use strict'

// d3-fg is likely a temporary dep, most layout logic will move to analysis and
// most draw / interactivity logic will be replaced here
const d3Fg = require('d3-fg')
const flameGradient = require('flame-gradient')
const HtmlContent = require('./html-content.js')

const Message = require('./message.js')
const copy = require('copy-to-clipboard')

class FlameGraph extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.hoveredNodeData = null
    this.zoomedNodeData = null
    this.changedWidth = false

    this.hideToolTip = this.hideToolTip.bind(this)
  }

  initializeElements () {
    super.initializeElements()
    this.d3Chart = this.d3Element.append('chart')
      .classed('flamegraph-outer', true)
      .style('position', 'relative')

    // creating the tooltip component
    this.d3Tooltip = this.d3Chart.append('div')
      .classed('tooltip', true)
    this.d3TooltipInner = this.d3Tooltip.append('div')
      .classed('tooltip-inner', true)
    this.d3CopyBtn = this.d3TooltipInner.append('button')
      .classed('tt-copy', true)
      .html(`
        <span class='icon'><img data-inline-svg class="icon-img" src="/visualizer/assets/icons/copy.svg" /></span>
        <span>Copy</span>
        <span>path</span>
      `)
      .on('click', () => {
        var data = this.hoveredNodeData.name.split(' ')[1]
        Message.info(`
          <span>Path copied to the clipboard!</span>
          <pre>${data}</pre>
        `, 4000)
        copy(data)
      })
    this.d3ZoomBtn = this.d3TooltipInner.append('button')
      .classed('tt-zoom', true)
      .html(`
        <span class='icon'><img data-inline-svg class="icon-img" src="/visualizer/assets/icons/zoom.svg" /></span>
        <span class='label'>Expand</span>
      `)
      .on('click', () => {
        const zoomingOut = this.hoveredNodeData === this.zoomedNodeData
        if (zoomingOut) this.zoomedNodeData = null
        this.flameGraph.zoom(zoomingOut ? null : this.hoveredNodeData)
      })
  }

  initializeFromData () {
    // TODO rather than calculating this single value here, we should be walking through
    // all the nodes and sorting high stackTop values, so we can
    // 1) display a heat key at the top;
    // 2) pick the highest value from that list for use here.
    const highest = this.getHighestStackTop(this.ui.dataTree.unmerged)

    this.flameGraph = d3Fg({
      tree: this.ui.dataTree.unmerged,
      exclude: this.ui.exclude,
      element: this.d3Chart.node(),
      topOffset: 55,
      cellHeight: 20,
      heatBars: true,
      frameColors: {
        fill: '#000',
        stroke: '#363b4c'
      },
      // We already categorized nodes during analysis
      categorizer: (node) => ({ type: node.type }),
      labelColors: {
        default: '#fff',
        app: '#cde3ff',
        core: '#626467',
        deps: '#3f7dc6'
      },
      width: this.d3Element.node().clientWidth,
      height: undefined, // we need to improve the way the canvas height gets calculated in d3-fg
      renderTooltip: null, // disabling the built-in tooltip
      colorHash: (stackTop, { d, decimalAdjust, allSamples, tiers }) => {
        // 0 = lowest unadjusted value, 1 = highest, can be <0 or >1 due to decimalAdjust
        const decimal = (this.getStackTop(d) / highest) * (decimalAdjust || 1)
        const rgb = flameGradient(decimal)
        return rgb
      }
    })

    // tooltip
    let tooltipHandler = null
    const copyBtnChildren = this.d3CopyBtn.selectAll('span')
    const zoomBtnChildren = this.d3ZoomBtn.selectAll('span')

    this.flameGraph.on('hoverin', (nodeData, rect, pointerCoords) => {
      // adding a little delay if no tooltip is already displayed
      const delay = this.hoveredNodeData === null ? 500 : 0

      // return if it's hovering over the same node
      if (this.hoveredNodeData === nodeData) return

      clearTimeout(tooltipHandler)

      tooltipHandler = setTimeout(
        () => {
          this.hoveredNodeData = nodeData

          // the zoomBtn label is dynamic...
          this.updateZoomBtnLabel(this)

          const ttLeft = pointerCoords.x

          // NB: 40 should be the width of the 2 icons (copy and zoom),
          // please adjust this value when we get final design
          const ttMinWidth = Math.max(rect.w, 40)
          this.d3Tooltip
            .style('display', 'block')
            .style('left', `${ttLeft}px`)
            .style('top', `${rect.y}px`)

          // showing only the part of the button label that fits in the available space
          setTooltipChildVisibility(copyBtnChildren, ttMinWidth / 2)
          setTooltipChildVisibility(zoomBtnChildren, ttMinWidth / 2)

          // calculating the actual tooltip width
          const ttWidth = this.d3TooltipInner.node().getBoundingClientRect().width

          // positioning the tooltip content
          // making sure that it doesn't go over the frame right edge
          const alignRight = ttLeft + ttWidth - rect.x - rect.w
          let deltaX = Math.max(alignRight, ttWidth / 2)

          // then checking it doesn't overflow the frame left edge
          deltaX = (ttLeft - deltaX < rect.x) ? ttLeft - rect.x : deltaX

          // then checking the canvas right edge
          const canvasWidth = this.d3Element.node().clientWidth
          deltaX = (ttLeft - deltaX + ttWidth > canvasWidth) ? alignRight : deltaX

          this.d3TooltipInner
            .style('left', `-${deltaX}px`)
        }

        , delay)
    })

    this.flameGraph.on('hoverout', (node) => {
      clearTimeout(tooltipHandler)
      tooltipHandler = setTimeout(this.hideToolTip, 400)
    })

    this.d3Tooltip.on('mouseover', () => {
      clearTimeout(tooltipHandler)
    })
    this.d3Tooltip.on('mouseout', () => {
      clearTimeout(tooltipHandler)
      tooltipHandler = setTimeout(this.hideToolTip, 200)
    })

    this.flameGraph.on('zoom', (nodeData) => {
      this.hideToolTip()
      this.zoomedNodeData = nodeData
    })

    this.flameGraph.on('animationEnd', () => {
      // can come handy to have this cb...
    })

    // triggering the resize after the canvas rendered to take possible scrollbars into account
    this.resize()
  }

  hideToolTip () {
    this.hoveredNodeData = null
    this.d3Tooltip.style('display', 'none')
  }

  getHighestStackTop (tree) {
    return tree.children
      ? tree.children.reduce((highest, child) => {
        const newValue = this.getHighestStackTop(child)
        return newValue > highest ? newValue : highest
      }, this.getStackTop(tree))
      : 0
  }

  getStackTop (frame) {
    let stackTop = frame.stackTop.base
    this.ui.exclude.forEach((excluded) => {
      stackTop += frame.stackTop[excluded]
    })
    return stackTop
  }

  resize () {
    const previousWidth = this.width
    this.width = this.d3Element.node().clientWidth
    if (this.width !== previousWidth) {
      this.changedWidth = true
      this.draw()
    }
  }

  draw () {
    super.draw()
    if (!this.flameGraph) this.initializeFromData()

    if (this.changedWidth) {
      this.changedWidth = false
      this.flameGraph.width(this.width)
    }
  }

  updateZoomBtnLabel () {
    const isZoomed = this.zoomedNodeData === this.hoveredNodeData
    this.d3ZoomBtn.select('.label').text(isZoomed ? 'Contract' : 'Expand')
  }
}

module.exports = FlameGraph

function setTooltipChildVisibility (elems, width) {
  let totalWidth = 0
  return elems.each(function () {
    this.style.display = ''
    totalWidth += this.getBoundingClientRect().width
    this.style.display = totalWidth > width ? 'none' : ''
  })
}
