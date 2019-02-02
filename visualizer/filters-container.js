'use strict'

const HtmlContent = require('./html-content.js')

class FiltersContent extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    // layout wrappers
    this.d3Left = this.addContent('HtmlContent', {
      classNames: 'left-col col-wrapper'
    })

    this.d3Center = this.addContent('HtmlContent', {
      classNames: 'center-col col-wrapper'
    })

    this.d3Right = this.addContent('HtmlContent', {
      classNames: 'right-col col-wrapper'
    })

    // components
    this.d3Right.addContent('SearchBox', {
      id: 'search-box',
      classNames: 'inline-panel'
    })

    this.d3Right.addContent('FiltersContent', {
      id: 'filters-content'
    })
  }

  initializeElements () {
    super.initializeElements()
  }

  draw () {
    super.draw()
  }
}

module.exports = FiltersContent
