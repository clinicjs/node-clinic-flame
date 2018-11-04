'use strict'

const HtmlContent = require('./html-content.js')

class Key extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.appName = 'app'
  }

  initializeElements () {
    super.initializeElements()

    this.d3Title = this.d3Element.append('div')
      .classed('key-title', true)

    this.d3AppName = this.d3Element.append('div')
      .classed('key key-app', true)
      .text(this.appName)
    this.d3Element.append('div')
      .classed('key key-deps', true)
      .text('dependencies')
    this.d3Element.append('div')
      .classed('key key-core', true)
      .text('node core')

    this.ui.on('setData', () => {
      this.setData()
    })
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

    this.d3AppName.text(this.appName)

    const titleHTML = `Call stacks in <em>${this.appName}</em>, grouped, by time spent on stack`
    this.d3Title.html(titleHTML)
  }
}

module.exports = Key
