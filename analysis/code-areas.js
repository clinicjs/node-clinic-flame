'use strict'

// Turn a Set of code area names into a sorted list of code area objects.
// This sorts by name right now, just to have a consistent output,
// but could use eg. the heat of the area in the future.
function toCodeAreaChildren (set) {
  return Array.from(set, (id) => {
    return { id }
  }).sort(sorter)

  function sorter (a, b) {
    return a.id.localeCompare(b.id)
  }
}

function collectCodeAreas (trees) {
  const appCodeAreas = new Set()
  const depCodeAreas = new Set()

  function collect (node) {
    if (node.category === 'deps') {
      depCodeAreas.add(node.type)
    }
  }

  // Make sure we have all code areas that are used, by collecting from both merged and unmerged trees.
  trees.merged.walk(collect)
  trees.unmerged.walk(collect)

  const codeAreas = [
    {
      id: 'app',
      children: toCodeAreaChildren(appCodeAreas),
      // Only show the "show more" button if there's many code areas
      // at 2 or less the button will take at least as much space as the area labels anyway
      childrenVisibilityToggle: appCodeAreas.size > 2
    },
    {
      id: 'deps',
      children: toCodeAreaChildren(depCodeAreas),
      childrenVisibilityToggle: depCodeAreas.size > 2
    },
    { id: 'wasm' },
    { id: 'core' },
    {
      id: 'all-v8',
      children: [
        { id: 'v8' },
        { id: 'native' },
        { id: 'cpp' },
        { id: 'regexp' }
      ],
      childrenVisibilityToggle: true
    }
  ]

  codeAreas.forEach(area => {
    area.excludeKey = area.id
    if (area.children) {
      area.children.forEach(childArea => {
        childArea.excludeKey = `${area.id}:${childArea.id}`
      })
    }
  })

  return codeAreas
}

module.exports = collectCodeAreas
