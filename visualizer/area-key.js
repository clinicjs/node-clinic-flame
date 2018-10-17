'use strict'

const HtmlContent = require('./html-content.js')

class AreaKey extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    const defaults = {
      id: 'area-key',
      classNames: 'panel'
    }
    contentProperties = Object.assign({}, defaults, contentProperties)
    super(parentContent, contentProperties)

    this.appName = 'app'
  }

  initializeElements () {
    super.initializeElements()

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
  }
}

module.exports = AreaKey
