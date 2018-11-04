'use strict'

/**
 * Pre-calculate the visible stack top values for the default state
 */

const {
  getStackTop,
  isNodeExcluded,
  defaultExclude
} = require('../shared.js')

function addStackTopValues (node) {
  if (isNodeExcluded(node, defaultExclude)) {
    node.onStackTop.asViewed = 0
  } else {
    node.onStackTop.asViewed = getStackTop(node, defaultExclude)
  }
  return node
}

module.exports = addStackTopValues
