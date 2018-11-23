'use strict'

const shared = require('../shared.js')
const flameGradient = require('flame-gradient')
const d3 = require('./d3.js')

class DataTree {
  constructor (tree) {
    this.merged = tree.merged
    this.unmerged = tree.unmerged

    this.codeAreas = tree.codeAreas

    // Set a reasonable upper limit to displayed name; exact name matching is done in analysis
    this.appName = tree.appName.length > 30 ? tree.appName.slice(0, 30) + '…' : tree.appName
    this.pathSeparator = tree.pathSeparator

    this.mergedNodes = getFlatArray(this.merged.children)
    this.unmergedNodes = getFlatArray(this.unmerged.children)

    this.useMerged = true
    this.showOptimizationStatus = false
    this.exclude = new Set(['cpp', 'regexp', 'v8', 'native', 'init'])

    // Set and updated in .update()
    this.flatByHottest = null
    this.mean = 0
    this.highestStackTop = 0
    this.maxRootAboveMean = 0
    this.maxRootBelowMean = 0

    this.setStackTop = shared.setStackTop.bind(this)
    this.isNodeExcluded = shared.isNodeExcluded.bind(this)
  }

  update (initial) {
    if (!initial) this.setStackTop(this.activeTree())
    this.sortFramesByHottest()
    this.mean = d3.mean(this.flatByHottest, node => node.onStackTop.asViewed)
    this.highestStackTop = this.flatByHottest[0].onStackTop.asViewed
    this.calculateRoots()
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

  sortFramesByHottest (customRootNode) {
    if (customRootNode) {
      // Flattened tree, sorted hottest first, including the root node
      let frames = getFlatArray(customRootNode.children)
      this.flatByHottest = this.getFlattenedSorted(this.getStackTopSorter(), [customRootNode].concat(frames))
    } else {
      // Flattened tree, sorted hottest first, excluding the 'all stacks' root node
      this.flatByHottest = this.getFlattenedSorted(this.getStackTopSorter(), this.activeNodes())
    }
    this.highestStackTop = this.flatByHottest[0].onStackTop.asViewed
  }

  calculateRoots (arr = this.flatByHottest) {
    // Used to give a reasonable flame gradient range above and below the mean value
    let maxRootAboveMean = 0
    let maxRootBelowMean = 0

    const count = arr.length
    for (let i = 0; i < count; i++) {
      const node = this.flatByHottest[i]

      if (node.onStackTop.asViewed > this.mean) {
        node.onStackTop.rootFromMean = Math.sqrt(node.onStackTop.asViewed - this.mean)
        if (node.onStackTop.rootFromMean > maxRootAboveMean) maxRootAboveMean = node.onStackTop.rootFromMean
      } else if (node.onStackTop.asViewed < this.mean) {
        node.onStackTop.rootFromMean = Math.sqrt(this.mean - node.onStackTop.asViewed)
        if (node.onStackTop.rootFromMean > maxRootBelowMean) maxRootBelowMean = node.onStackTop.rootFromMean
      } else { // Exactly equals mean
        node.onStackTop.rootFromMean = 0
      }
    }

    this.maxRootAboveMean = maxRootAboveMean
    this.maxRootBelowMean = maxRootBelowMean
  }

  activeTree () {
    return this.useMerged ? this.merged : this.unmerged
  }

  activeNodes () {
    return this.useMerged ? this.mergedNodes : this.unmergedNodes
  }

  setActiveTree (useMerged = false) {
    this.useMerged = useMerged === true

    // Showing optimization status doesn't make any sense on merged tree
    if (useMerged) this.showOptimizationStatus = false

    this.update()
  }

  getFlattenedSorted (sorter, arr) {
    const filtered = arr.filter(node => !this.exclude.has(node.type))
    return filtered.sort(sorter)
  }

  getHeatColor (node, arr = this.flatByHottest) {
    if (!node) return flameGradient(0)

    const pivotPoint = this.mean / (this.mean + this.maxRootAboveMean + this.maxRootBelowMean)

    if (node.onStackTop.rootFromMean === 0 || node.onStackTop.asViewed === this.mean) return flameGradient(pivotPoint)

    if (node.onStackTop.asViewed > this.mean) {
      return flameGradient(pivotPoint + (node.onStackTop.rootFromMean / this.maxRootAboveMean) * (0.95 - pivotPoint))
    } else {
      return flameGradient(pivotPoint - (node.onStackTop.rootFromMean / this.maxRootBelowMean) * pivotPoint)
    }
  }

  getFrameByRank (rank, arr = this.flatByHottest) {
    if (!arr) return null
    return arr[rank] || null
  }

  getStackTopSorter () {
    return (nodeA, nodeB) => {
      const topA = nodeA.onStackTop.asViewed
      const topB = nodeB.onStackTop.asViewed

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
