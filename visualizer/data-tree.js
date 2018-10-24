'use strict'

class DataTree {
  constructor (tree) {
    this.merged = tree.merged
    this.unmerged = tree.unmerged
    // TODO: system info etc

    this.useMerged = false
    this.showOptimizationStatus = false
    this.exclude = new Set(['cpp', 'regexp', 'v8', 'native', 'init'])

    // TODO: Implement this, test performance; if it's slow, keep merged and unmerged flat arrays
    // this.flat = this.flatten().sort(sortByStackTop)
  }

  activeTree () {
    return this.useMerged ? this.merged : this.unmerged
  }

  setCodeAreaVisibility (name, visible) {
    if (visible) {
      this.exclude.delete(name)
    } else {
      this.exclude.add(name)
    }
  }

  getHighestStackTop (tree = this.activeTree()) {
    return tree.children
      ? tree.children.reduce((highest, child) => {
        const newValue = this.getHighestStackTop(child)
        return newValue > highest ? newValue : highest
      }, this.getStackTop(tree))
      : 0
  }

  getStackTop (frame) {
    let stackTop = frame.stackTop.base
    this.exclude.forEach((excluded) => {
      stackTop += frame.stackTop[excluded]
    })
    return stackTop
  }
}

module.exports = DataTree
