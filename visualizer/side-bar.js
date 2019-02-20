'use strict'
const HtmlContent = require('./html-content.js')

class SideBar extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)
    this.animationEnd = contentProperties.animationEnd
    this.isExpanded = false
  }

  initializeElements () {
    super.initializeElements()

    this.d3ContentWrapper.attr('id', 'side-bar')

    this.d3ContentWrapper.on('animationend', () => {
      this.isExpanded = !this.isExpanded

      if (this.isExpanded) {
        this.d3ContentWrapper.classed('contract', false)
      }

      this.animationEnd(this.isExpanded)
    })
  }

  slideIn () {
    this.d3ContentWrapper.classed('expand', true)
  }

  slideOut () {
    this.d3ContentWrapper.classed('expand', false)
    this.d3ContentWrapper.classed('contract', true)
  }

  toggle (isVisible) {
    // const className = isVisible ? 'expand' : 'contract'
    this.d3ContentWrapper.classed('expand', isVisible)
    this.d3ContentWrapper.classed('contract', !isVisible)
  }

  draw () {
    super.draw()
  }
}

module.exports = SideBar
