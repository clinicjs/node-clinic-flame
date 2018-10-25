const d3 = require('d3')
const HtmlContent = require('./html-content.js')
const flameGradient = require('flame-gradient')

class StackBar extends HtmlContent {
  initializeElements () {
    super.initializeElements()
  }

  prepareFrames () {
    const { dataTree } = this.ui
    const rootNode = dataTree.activeTree()
    const highest = dataTree.getHighestStackTop()
    const availableWidth = this.d3Element.node().getBoundingClientRect().width
    const onePxPercent = 1 / availableWidth

    const frames = []
    let usedWidth = 0.0
    for (let i = 0; i < dataTree.flatByHottest.length; i++) {
      const d = dataTree.flatByHottest[i]
      const stackTop = dataTree.getStackTop(d)
      const highestFraction = stackTop / highest
      const totalFraction = Math.max(onePxPercent, stackTop / rootNode.value)

      const width = totalFraction
      const margin = totalFraction > 0.02 ? 2 : 1

      frames.push({ d, width, margin, colorValue: highestFraction })

      usedWidth += width + (margin / availableWidth)
      if (usedWidth >= 0.98) {
        const remaining = dataTree.flatByHottest.slice(i + 1)
        const remainingFraction = dataTree.getStackTop(remaining[0]) / highest
        frames.push({ remaining, width: 1 - usedWidth, margin: 0, colorValue: remainingFraction })
        break
      }
    }

    return frames
  }

  draw () {
    super.draw()

    const { dataTree } = this.ui
    if (dataTree.flatByHottest === null) {
      return
    }

    if (process.env.DEBUG_MODE) {
      console.time('StackBar.draw')
    }

    const frames = this.prepareFrames()
    const update = this.d3Element.selectAll('div')
      .data(frames)
    update.exit().remove()

    update.enter().append('div')
      .classed('stack-frame', true)
      .merge(update)
      .each(function ({ width, margin, colorValue }) {
        d3.select(this)
          .style('background-color', flameGradient(colorValue))
          .style('width', `${(width * 100).toFixed(3)}%`)
          .style('margin-right', `${margin}px`)
      })

    if (process.env.DEBUG_MODE) {
      console.timeEnd('StackBar.draw')
    }
  }
}

module.exports = StackBar
