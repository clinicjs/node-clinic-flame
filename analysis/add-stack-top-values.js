'use strict'

/**
 * Pre-calculate the visible stack top values for the default state
 */

const {
  setStackTop,
  defaultExclude
} = require('../shared.js')

function addStackTopValues (tree) {
  setStackTop(tree, defaultExclude)
}

module.exports = addStackTopValues
