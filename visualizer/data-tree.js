'use strict'

const shared = require('../shared.js')
const flameGradient = require('flame-gradient')
const getNoDataNode = require('./no-data-node.js')
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
    this.exclude = shared.defaultExclude

    // Set and updated in .update()
    this.flatByHottest = null
    this.mean = 0
    this.highestStackTop = 0
    this.maxRootAboveMean = 0
    this.maxRootBelowMean = 0

    // Set by countTotalFrames
    this.totalFrames = null

    this.setStackTop = shared.setStackTop.bind(this)
    this.isNodeExcluded = shared.isNodeExcluded.bind(this)
  }

  update (initial) {
    if (!initial) this.setStackTop(this.activeTree())
    this.sortFramesByHottest()
    this.mean = d3.mean(this.flatByHottest, node => node.onStackTop.asViewed)
    this.highestStackTop = this.flatByHottest[0].onStackTop.asViewed
    this.calculateRoots()
    this.computeGroupedSortValues()
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
      const frames = getFlatArray(customRootNode.children)
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
    const filtered = arr.filter(node => !this.isNodeExcluded(node))
    if (filtered.length) return filtered.sort(sorter)
    return [getNoDataNode()]
  }

  getHeatColor (node, arr = this.flatByHottest) {
    if (!node || this.isNodeExcluded(node) || this.mean === 0) return flameGradient(0)

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
    return (nodeA, nodeB) => {
      const groupA = this.groupedSortValues.get(nodeA)
      const groupB = this.groupedSortValues.get(nodeB)
      if (groupA > groupB) return -1
      if (groupA < groupB) return 1

      const valueA = this.getNodeValue(nodeA)
      const valueB = this.getNodeValue(nodeB)

      return valueA === valueB ? 0 : valueA > valueB ? -1 : 1
    }
  }

  computeGroupedSortValues () {
    this.groupedSortValues = new Map()

    const completeNodesArray = [this.activeTree()].concat(this.activeNodes())

    completeNodesArray.forEach(node => {
      const group = Object.create(null)
      node.childGroups = group

      if (!node.children || this.isNodeExcluded(node)) return

      const nextVisibleDescendents = this.getVisibleChildren(node)

      nextVisibleDescendents.forEach((child) => {
        const type = this.getTypeKey(child)
        const value = this.getNodeValue(child)
        if (type in group) {
          group[type] += value
        } else {
          group[type] = value
        }
      })

      nextVisibleDescendents.forEach((child) => {
        const type = this.getTypeKey(child)
        this.groupedSortValues.set(child, group[type])
      })

      node.childGroups = group
    })
  }

  isOffScreen (node) {
    // d3-fg sets `value` to 0 to hide off-screen nodes. The "real" value is stored on `.original`.
    return node.value === 0 && typeof node.original === 'number'
  }

  getNodeValue (node) {
    if (this.isNodeExcluded(node)) {
      // Value of hidden frames is the sum of their visible children
      return node.children
        ? node.children.reduce((acc, child) => {
            return acc + this.getNodeValue(child)
          }, 0)
        : 0
    }

    return this.isOffScreen(node) ? node.original : node.value
  }

  getTypeKey (node) {
    return `${node.category}:${node.type}`
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

  getVisibleChildren (node = this.activeTree()) {
    // Can pass in data nodes or D3 partition nodes; gets closest visible descendents of same type

    let nextVisibleDescendents = []
    const childCount = node.children ? node.children.length : 0
    for (let i = 0; i < childCount; i++) {
      const child = node.children[i]
      if (this.isNodeExcluded(child.data || child)) {
        nextVisibleDescendents = nextVisibleDescendents.concat(this.getVisibleChildren(child))
      } else {
        nextVisibleDescendents.push(child)
      }
    }
    return nextVisibleDescendents
  }
}

function getFlatArray (children) {
  // Flatten the tree, excluding the root node itself (i.e. the 'all stacks' node)
  return [...children].concat(children.reduce((arr, child) => {
    if (child.children) {
      return arr.concat(getFlatArray(child.children))
    }
    return arr
  }, []))
}

module.exports = DataTree
