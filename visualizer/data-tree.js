'use strict'

const shared = require('../shared.js')

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

    // Set and updated in .update()
    this.flatByHottest = null
    this.highestStackTop = null

    this.getStackTop = shared.getStackTop.bind(this)
    this.isNodeExcluded = shared.isNodeExcluded.bind(this)
  }

  update () {
    this.sortFramesByHottest()
    this.updateHighestStackTop()
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
    this.update()
  }

  getFlattenedSorted (sorter) {
    const arr = this.activeNodes()
    const filtered = arr.filter(node => !this.exclude.has(node.type))
    return filtered.sort(sorter)
  }

  updateHighestStackTop () {
    this.highestStackTop = this.getStackTop(this.flatByHottest[0])
  }

  getFrameByRank (rank, arr = this.flatByHottest) {
    if (!arr) return null
    return arr[rank] || null
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
    return arr ? arr.length : 0
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
