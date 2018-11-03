'use strict'
/**
 * Functions shared between frontend (visualizer) and backend (analysis)
 */

function getStackTop (node, exclude = this.exclude) {
  const childCount = node.children ? node.children.length : 0
  let topTotal = node.stackTop.base

  // Will be called many many times in browser, use vanilla for/i for speed
  for (var i = 0; i < childCount; i++) {
    // Add stack top of excluded children and chains of excluded descendents
    if (isNodeExcluded(node.children[i], exclude)) topTotal += getStackTop(node.children[i], exclude)
  }
  return topTotal
}

function isNodeExcluded (node, exclude = this.exclude) {
  if (node.isInit && exclude.has('init')) return true
  if (node.isInlinable && exclude.has('inlinable')) return true

  if (exclude.has(node.category)) return true
  if (exclude.has(node.type)) return true

  return false
}

module.exports = {
  getStackTop,
  isNodeExcluded
}
