'use strict'

const HtmlContent = require('./html-content.js')

class AreaKey extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    const defaults = {
      classNames: 'key-panel panel'
    }
    contentProperties = Object.assign({}, defaults, contentProperties)
    super(parentContent, contentProperties)
  }
}

module.exports = AreaKey
