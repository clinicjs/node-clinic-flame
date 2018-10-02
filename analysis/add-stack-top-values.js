/**
 * Fills out a `onStackTop` object property on nodes. The keys are filter types. Each value determines how much will be _added_ to the node's `onStackTop.base` value when that filter type is _excluded_.
 * For example, given a `onStackTop` value like:
 * { base: 20, v8: 11000 }
 * When the v8 nodes are shown (type "v8" is _not_ excluded), the node was at the top in 20 samples.
 * When the v8 nodes are hidden (type "v8" is excluded), the node was at the top in 20 + 11000 samples.
 */

const filterTypes = new Set([
  'app',
  'deps',
  'core',
  'v8',
  'cpp',
  'init',
  'native',
  'regexp'
])

function addStackTopValues (node) {
  filterTypes.forEach((type) => {
    addStackTopForType(node, type)
  })

  return node
}

// Compute a stack top value for a single filter type.
function addStackTopForType (node, type) {
  node.onStackTop[type] = node.children.reduce((top, child) => {
    // Recurse
    addStackTopForType(child, type)
    if (child.type === type) {
      return top + child.onStackTop.base + child.onStackTop[type]
    }
    return top
  }, 0)
}

module.exports = addStackTopValues
