'use strict'

class DataTree {
  constructor (tree) {
    this.merged = tree.merged
    this.unmerged = tree.unmerged

    // Set a reasonable upper limit to displayed name; exact name matching is done in analysis
    this.appName = tree.appName.length > 30 ? tree.appName.slice(0, 30) + '…' : tree.appName
    this.pathSeparator = tree.pathSeparator

    this.mergedNodes = getFlatArray(this.merged.children)
    this.unmergedNodes = getFlatArray(this.unmerged.children)

    this.useMerged = false
    this.showOptimizationStatus = false
    this.exclude = new Set(['cpp', 'regexp', 'v8', 'native', 'init'])

    this.flatByHottest = null // Set after d3-fg sets .hide on frames. TODO: bring this forward
  }

  show (name) {
    if (this.exclude.has(name)) {
      this.exclude.delete(name)
      return true
    }
    return false
  }

  hide (name) {
    if (!this.exclude.has(name)) {
      this.exclude.add(name)
      return true
    }
    return false
  }

  sortFramesByHottest () {
    // Flattened tree, sorted hottest first, excluding the 'all stacks' root node
    this.flatByHottest = this.getFlattenedSorted(this.getStackTopSorter())
  }

  activeTree () {
    return this.useMerged ? this.merged : this.unmerged
  }

  activeNodes () {
    return this.useMerged ? this.mergedNodes : this.unmergedNodes
  }

  setActiveTree (useMerged = false) {
    this.useMerged = useMerged === true
    this.sortFramesByHottest()
  }

  getFlattenedSorted (sorter) {
    const arr = this.activeNodes()
    const filtered = arr.filter(node => !node.hide)
    return filtered.sort(sorter)
  }

  getHighestStackTop (tree = this.activeTree()) {
    if (this.flatByHottest) return this.getStackTop(this.flatByHottest[0])

    return tree.children
      ? tree.children.reduce((highest, child) => {
        const newValue = this.getHighestStackTop(child)
        return newValue > highest ? newValue : highest
      }, this.getStackTop(tree))
      : 0
  }

  getFrameByRank (rank, arr = this.flatByHottest) {
    if (!arr) return null
    return arr[rank] || null
  }

  getStackTop (frame) {
    let stackTop = frame.stackTop.base
    this.exclude.forEach((excluded) => {
      stackTop += frame.stackTop[excluded]
    })
    return stackTop
  }

  getStackTopSorter () {
    return (nodeA, nodeB) => {
      const topA = this.getStackTop(nodeA)
      const topB = this.getStackTop(nodeB)

      // Sort highest first, treating equal as equal
      return topA === topB ? 0 : topA > topB ? -1 : 1
    }
  }

  getFilteredStackSorter () {
    const exclude = this.exclude

    function getValue (node) {
      if (exclude.has(node.type)) {
        // Value of hidden frames is the sum of their visible children
        return node.children ? node.children.reduce((acc, child) => {
          return acc + getValue(child)
        }, 0) : 0
      }

      // d3-fg sets `value` to 0 to hide off-screen nodes.
      // there's no other property to indicate this but the original value is stored on `.original`.
      if (node.value === 0 && typeof node.original === 'number') {
        return node.original
      }
      return node.value
    }

    return (nodeA, nodeB) => {
      const valueA = getValue(nodeA)
      const valueB = getValue(nodeB)

      return valueA === valueB ? 0 : valueA > valueB ? -1 : 1
    }
  }

  getSortPosition (node, arr = this.flatByHottest) {
    return arr.indexOf(node)
  }

  countFrames (arr = this.flatByHottest) {
    return arr.length
  }

  getNodeById (id) {
    const arr = this.activeNodes()
    return arr.find((node) => node.id === id)
  }
}

function getFlatArray (children) {
  // Flatten the tree, excluding the root node itself (i.e. the 'all stacks' node)
  return [...children].concat(children.reduce((arr, child) => {
    if (child.children) return arr.concat(getFlatArray(child.children))
  }, []))
}

module.exports = DataTree
