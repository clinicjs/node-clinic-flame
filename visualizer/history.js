const EventEmitter = require('events')
const qs = require('querystringify')

class History extends EventEmitter {
  constructor () {
    super()

    this.availableExclusions = []

    /* istanbul ignore next: not available in node.js tests */
    if (typeof window !== 'undefined') {
      // Using `hashchange` rather than `popstate` so manually
      // fiddling with the hash works
      window.addEventListener('hashchange', (event) => {
        const hash = event.newURL.replace(/^.*?#/, '')
        if (hash) {
          this.emit('change', this.deserialize(hash))
        }
      })
    }
  }

  setData (dataTree) {
    // TODO take this information from dataTree
    // once analysis supports it.
    this.availableExclusions = [
      'app',
      'deps',
      'core',
      'all-v8:native',
      'all-v8:cpp',
      'all-v8:v8',
      'all-v8:regexp',
      'is:init',
      'is:inlinable'
    ]

    if (window.location.hash) {
      this.emit('change', this.deserialize(window.location.hash.replace(/^#/, '')))
    }
  }

  push (params, opts) {
    const hash = this.serialize(params)
    const path = `${window.location.pathname}#${hash}`
    if (opts.replace) {
      window.history.replaceState({ hash }, null, path)
    } else {
      window.history.pushState({ hash }, null, path)
    }
  }

  serializeExcludes (exclude) {
    if (!(exclude instanceof Set)) throw new TypeError('`exclude` argument must be a Set')

    const bits = this.availableExclusions
      .map((name) => exclude.has(name) ? '1' : '0')
      .join('')

    return parseInt(bits, 2).toString(16)
  }

  deserializeExcludes (string) {
    const bits = parseInt(string, 16).toString(2)
      // The leading 0s were dropped in the parseInt(2).toString(16) serialization dance, add them back.
      .padStart(this.availableExclusions.length, '0')
      .split('')
      .map((n) => n === '1')

    const exclude = new Set()
    this.availableExclusions.forEach((name, i) => {
      if (bits[i]) {
        exclude.add(name)
      }
    })

    return exclude
  }

  deserialize (query) {
    const params = qs.parse(query)
    const exclude = this.deserializeExcludes(params.exclude)
    const useMerged = params.merged === 'true'
    const showOptimizationStatus = params.showOptimizationStatus === 'true'
    const selectedNodeId = parseInt(params.selectedNode, 10)
    const zoomedNodeId = parseInt(params.zoomedNode, 10)
    const search = params.search || null
    return {
      exclude,
      useMerged,
      showOptimizationStatus,
      selectedNodeId,
      zoomedNodeId,
      search
    }
  }

  serialize ({
    exclude,
    useMerged,
    showOptimizationStatus,
    selectedNodeId,
    zoomedNodeId,
    search
  }) {
    const params = {
      selectedNode: selectedNodeId,
      zoomedNode: zoomedNodeId,
      exclude: this.serializeExcludes(exclude)
    }

    // Only add the below params if they contain information, to avoid cluttering
    // the hash with empty strings and falses.
    if (search != null && search !== '') {
      params.search = search
    }
    if (useMerged) {
      params.merged = true
    }
    if (showOptimizationStatus) {
      params.showOptimizationStatus = true
    }

    return qs.stringify(params)
  }
}

module.exports = History
