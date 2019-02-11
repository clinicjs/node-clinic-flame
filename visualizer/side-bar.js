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
        this.d3ContentWrapper.classed('slide-out', false)
      }

      this.animationEnd(this.isExpanded)
    })
  }

  slideIn () {
    this.d3ContentWrapper.classed('slide-in', true)
  }

  slideOut () {
    this.d3ContentWrapper.classed('slide-in', false)
    this.d3ContentWrapper.classed('slide-out', true)
  }

  toggle (isVisible) {
    // const className = isVisible ? 'slide-in' : 'slide-out'
    this.d3ContentWrapper.classed('slide-in', isVisible)
    this.d3ContentWrapper.classed('slide-out', !isVisible)
  }

  draw () {
    super.draw()
  }
}

module.exports = SideBar
