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

  /* istanbul ignore next: no test for this yet */
  setData (dataTree) {
    const { codeAreas } = dataTree
    // Manually populate special quasi-categories
    this.availableExclusions = [
      'is:init',
      'is:inlinable'
    ]

    codeAreas.forEach((group) => {
      this.availableExclusions.push(group.excludeKey)
      if (Array.isArray(group.children)) {
        group.children.forEach((area) => {
          this.availableExclusions.push(area.excludeKey)
        })
      }
    })

    /* istanbul ignore next: browser only */
    if (window.location.hash) {
      this.emit('change', this.deserialize(window.location.hash.replace(/^#/, '')))
    }
  }

  /* istanbul ignore next: browser only */
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

    // serialize in groups of 16 bits (4 hex characters)
    // this way we can have more groups than there are (reliable) bits in a JS number.
    const groups = []
    const groupSize = Math.pow(2, 4)
    for (let i = 0; i < bits.length; i += groupSize) {
      // If there are less than 16 bits left, we add some dummy 0s at the end which
      // are ignored by deserializeExcludes().
      const word = bits.slice(i, i + groupSize)
        .padEnd(groupSize, '0')
      groups.push(parseInt(word, 2).toString(16))
    }
    return groups.join('-')
  }

  deserializeExcludes (string) {
    const bits = []
    const groupSize = Math.pow(2, 4)
    const groups = string.split('-')
    groups.forEach((group, i) => {
      const groupBits = parseInt(group, 16).toString(2)
        // The leading 0s were dropped in the parseInt(2).toString(16) serialization dance
        // in serializeExcludes(), add them back.
        .padStart(groupSize, '0')
        .split('')
        .map((n) => n === '1')
      bits.push(...groupBits)
    })

    const exclude = new Set()
    this.availableExclusions.forEach((name, i) => {
      if (bits[i]) {
        exclude.add(name)
      }
    })
    return exclude
  }

  /* istanbul ignore next: no test for this yet */
  deserialize (query) {
    const params = qs.parse(query)
    const exclude = this.deserializeExcludes(params.exclude)
    const useMerged = params.merged === 'true'
    const showOptimizationStatus = params.showOptimizationStatus === 'true'
    const selectedNodeId = parseInt(params.selectedNode, 10)
    const zoomedNodeId = parseInt(params.zoomedNode, 10)
    const search = params.search || null
    const walkthroughIndex = params.walkthroughIndex ? parseInt(params.walkthroughIndex) : undefined
    return {
      exclude,
      useMerged,
      showOptimizationStatus,
      selectedNodeId,
      zoomedNodeId,
      search,
      walkthroughIndex
    }
  }

  /* istanbul ignore next: no test for this yet */
  serialize ({
    exclude,
    useMerged,
    showOptimizationStatus,
    selectedNodeId,
    zoomedNodeId,
    search,
    walkthroughIndex
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

    if (walkthroughIndex !== undefined) {
      params.walkthroughIndex = walkthroughIndex
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
