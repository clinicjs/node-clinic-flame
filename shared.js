'use strict'
/**
 * Functions shared between frontend (visualizer) and backend (analysis)
 */

function setStackTop (node, exclude = this.exclude) {
  const childCount = node.children.length
  const nodeIsExcluded = isNodeExcluded(node, exclude)
  let topTotal = node.onStackTop.base

  // Will be called many many times in browser, use vanilla for/i for speed
  for (let i = 0; i < childCount; i++) {
    // Add stack top of excluded children and chains of excluded descendents
    topTotal += setStackTop(node.children[i], exclude)
  }
  node.onStackTop.asViewed = nodeIsExcluded ? 0 : topTotal
  return nodeIsExcluded ? topTotal : 0
}

function isNodeExcluded (node, exclude = this.exclude) {
  if (node.isInit && exclude.has('is:init')) return true
  if (node.isInlinable && exclude.has('is:inlinable')) return true

  if (exclude.has(node.category)) return true

  // Namespace types by category in case someone installs a dependency named 'cpp' etc
  if (exclude.has(`${node.category}:${node.type}`)) return true

  return false
}

const defaultExclude = new Set([
  'all-v8:v8',
  'all-v8:cpp',
  'all-v8:native',
  'all-v8:regexp',
  'is:init'
])

module.exports = {
  setStackTop,
  isNodeExcluded,
  defaultExclude
}
