'use strict'

const HtmlContent = require('./html-content.js')

class Key extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.app = 'Profiled app'
    this.deps = 'Dependencies'
    this.core = 'Node Core'
  }

  initializeElements () {
    super.initializeElements()

    this.d3Title = this.d3Element.append('div')
      .classed('key-title', true)

    this.d3Key1 = this.d3Element.append('div')
      .classed('key', true)
      .text(this.app)
    this.d3Key2 = this.d3Element.append('div')
      .classed('key', true)
      .text(this.deps)
    this.d3Key3 = this.d3Element.append('div')
      .classed('key', true)
      .text(this.core)

    this.ui.on('setData', () => {
      this.setData()
    })

    this.ui.on('presentationMode', () => { this.draw() })
  }

  setData () {
    const {
      appName = 'app'
    } = this.ui.dataTree
    this.appName = appName

    this.draw()
  }

  draw () {
    super.draw()

    const showOpt = this.ui.dataTree.showOptimizationStatus

    this.d3Key1
      .text(showOpt ? 'Unoptimized' : this.appName)
      .style('color', this.ui.getFrameColor({
        category: 'app',
        isUnoptimized: true
      }, 'foreground', false))

    this.d3Key2
      .text(showOpt ? 'Optimized' : this.deps)
      .style('color', this.ui.getFrameColor({
        category: 'deps',
        isOptimized: true
      }, 'foreground', false))

    this.d3Key3
      .text(showOpt ? 'Not JavaScript' : this.core)
      .style('color', this.ui.getFrameColor({
        category: 'core'
      }, 'foreground', false))

    const titleHTML = `Call stacks in <em>${this.appName}</em>, grouped, by time spent on stack`
    this.d3Title.html(titleHTML)
  }
}

module.exports = Key
