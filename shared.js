'use strict'
/**
 * Functions shared between frontend (visualizer) and backend (analysis)
 */

function setStackTop (node, exclude = this.exclude) {
  const childCount = node.children.length
  const nodeIsExcluded = isNodeExcluded(node, exclude)
  let topTotal = node.onStackTop.base

  // Will be called many many times in browser, use vanilla for/i for speed
  for (var i = 0; i < childCount; i++) {
    // Add stack top of excluded children and chains of excluded descendents
    topTotal += setStackTop(node.children[i], exclude)
  }
  node.onStackTop.asViewed = nodeIsExcluded ? 0 : topTotal
  return nodeIsExcluded ? topTotal : 0
}

function isNodeExcluded (node, exclude = this.exclude) {
  if (node.isInit && exclude.has('init')) return true
  if (node.isInlinable && exclude.has('inlinable')) return true

  if (exclude.has(node.category)) return true
  if (exclude.has(node.type)) return true

  return false
}

const defaultExclude = new Set([
  'v8',
  'cpp',
  'init',
  'native',
  'regexp'
])

module.exports = {
  setStackTop,
  isNodeExcluded,
  defaultExclude
}
