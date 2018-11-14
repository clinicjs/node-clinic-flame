const selection = require('d3-selection')

const d3 = Object.assign(
  {},
  // d3.event
  // d3.select
  selection,
  // d3.mean
  require('d3-array')
)

// This property changes after importing so we fake a live binding.
Object.defineProperty(d3, 'event', {
  get () { return selection.event }
})

module.exports = d3
