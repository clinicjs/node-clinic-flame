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
  }

  initializeElements () {
    super.initializeElements()

    this.d3Element.append('div')
      .classed('key key-app', true)
      // TODO Set this to the actual app name inside a setData() method once the analysis contains it.
      .text('app')
    this.d3Element.append('div')
      .classed('key key-deps', true)
      .text('dependencies')
    this.d3Element.append('div')
      .classed('key key-core', true)
      .text('node core')
  }
}

module.exports = AreaKey
