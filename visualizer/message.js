'use strict'
const d3 = require('./d3.js')

const msgComponent = d3.select('body')
  .append('div')
  .attr('id', 'message-component')

module.exports = {
  info (msgHtml, duration = 5000) {
    const el = msgComponent.append('div')
      .classed('message-text', true)
      .html(msgHtml)

    setTimeout(() => {
      el.remove()
    }, duration)
  }
}
