const path = require('path')

const jsFrameRx = /^([~*])?((?:\S+?\(anonymous function\)|\S+)?(?: [a-zA-Z]+)*) (.*?):(\d+):(\d+)( \[INIT])?( \[INLINABLE])?$/
// This one has the /m flag because regexes may contain \n
const cppFrameRx = /^(.*) (\[CPP]|\[SHARED_LIB]|\[CODE:\w+])( \[INIT])?$/m

class FrameNode {
  constructor (data) {
    this.id = null

    /* istanbul ignore next: must be a string; can be null but can't replicate in tests */
    this.name = data.name || ''

    this.onStack = data.value
    this.onStackTop = { base: data.top }
    this.children = data.children
      ? data.children.map((frame) => new FrameNode(frame))
      : []

    this.functionName = null
    this.fileName = null
    this.fullFileName = null
    this.lineNumber = null
    this.columnNumber = null

    // Don't try to identify anything for the root node.
    if (this.name === 'all stacks') {
      return this
    }

    // C++ and v8 functions don't match, but they don't need to
    const m = this.name.match(jsFrameRx)
    if (m) {
      const [
        input, // eslint-disable-line no-unused-vars
        optimizationFlag,
        functionName,
        fileName,
        lineNumber,
        columnNumber,
        isInit,
        isInlinable
      ] = m
      this.functionName = functionName
      this.fileName = fileName
      this.fullFileName = fileName
      this.lineNumber = parseInt(lineNumber, 10)
      this.columnNumber = parseInt(columnNumber, 10)
      this.isInit = isInit != null
      this.isInlinable = isInlinable != null
      this.isOptimised = optimizationFlag === '~'
      this.isOptimisable = optimizationFlag === '*'
    } else {
      const m = this.name.match(cppFrameRx)
      /* istanbul ignore else: Only triggers if there's a bug */
      if (m) {
        const [
          input, // eslint-disable-line no-unused-vars
          functionName,
          tag,
          isInit
        ] = m
        const isSharedLib = tag === '[SHARED_LIB]'
        this.functionName = isSharedLib ? '[SHARED_LIB]' : functionName
        this.fileName = isSharedLib ? functionName : null
        this.isInit = isInit != null
      } else {
        throw new Error(`Encountered an unparseable frame "${this.name}"`)
      }
    }
  }

  isNodeCore (systemInfo) {
    const { fullFileName } = this

    // istanbul ignore if
    if (!fullFileName) return false

    return !getPlatformPath(systemInfo).isAbsolute(fullFileName)
  }

  categorise (systemInfo) {
    const { name } = this // this.name remains unmutated: the initial name returned by 0x

    const {
      category,
      type,
      typeTEMP // Temporary until d3-fg custom property filter complete
    } = this.getCoreType(name, systemInfo) ||
      this.getDepType(name, systemInfo) ||
      this.getAppType(name, systemInfo)

    this.category = category // Top level filters: 'app' or 'deps' or 'all-core'
    this.type = type // Second-level filters; core are static, app and deps depend on app
    this.typeTEMP = typeTEMP // Temporary access to dependency name or app directory

    if (type === 'regexp') {
      this.formatRegExpName()
    }
  }

  getTarget (systemInfo) {
    // App and its dependencies have local file paths; use those
    if (this.category === 'app' || this.category === 'deps') {
      return this.fileName
    }
    /** TODO: this is an example, add more like this with tests
    // Some core types have files that can be linked to in the appropriate Node build
    if (this.category === 'all-core') {
      const nodeVersion = systemInfo.nodeVersions.node

      if (this.type === 'core') return `https://github.com/nodejs/node/blob/v${nodeVersion}/lib/${this.fileName}#L${this.lineNumber}`
      // TODO: add more cases like this
    }
    */
  }

  getCoreType (name, systemInfo) {
    let type

    // TODO: Delete 'init' condition here when adding custom d3-fg filter on properties
    if (/\[INIT]$/.test(name)) {
      type = 'init'
    } else if (!/\.m?js/.test(name)) {
      if (/\[CODE:RegExp]$/.test(name)) {
        type = 'regexp'
      } else if (/\[CODE:.*?]$/.test(name) || /v8::internal::.*\[CPP]$/.test(name)) {
        type = 'v8'
      } else /* istanbul ignore next */ if (/\.$/.test(name)) {
        type = 'core'
      } else if (/\[CPP]$/.test(name) || /\[SHARED_LIB]$/.test(name)) {
        type = 'cpp'
      } else if (/\[eval]/.test(name)) {
        // unless we create an eval checkbox
        // "native" is the next best label since
        // you cannot tell where the eval comes
        // from (app, deps, core)
        type = 'native'
      } else {
        type = 'v8'
      }
    } else if (/ native /.test(name)) {
      type = 'native'
    } else if (this.isNodeCore(systemInfo)) {
      type = 'core'
    }

    return type ? {
      type,
      category: 'all-core'
    } : null
  }

  getDepType (name, systemInfo) {
    const escSep = getEscapedSeperator(systemInfo)
    const nodeModules = `${escSep}node_modules${escSep}`
    // Get last folder name after a /node_modules/ or \node_modules\
    const depDirRegex = new RegExp(`${nodeModules}(.+?)${escSep}(?!.*${nodeModules})`)

    const match = name.match(depDirRegex)
    return match ? {
      // TODO: use this type after adding custom d3-fg filter on properties including category
      typeTEMP: match[1],
      type: 'deps', // Temporary until d3-fg custom property filter complete
      category: 'deps'
    } : null
  }

  getAppType (name, systemInfo) {
    const platformPath = getPlatformPath(systemInfo)

    const parentDir = platformPath.join(systemInfo.mainDirectory, `..${systemInfo.pathSeparator}`)

    return {
      // TODO: use this type after adding custom d3-fg filter on properties including category
      typeTEMP: platformPath.relative(parentDir, platformPath.dirname(this.fileName)),
      type: 'app', // Temporary until d3-fg custom property filter complete
      category: 'app'
    }
  }

  anonymise (systemInfo) {
    if (!this.fileName || this.isNodeCore(systemInfo) ||
        // Init frames are in the all-core category but may be part of the app.
        // TODO Remove the `init` after adding custom d3-fg filter on properties like `isInit`
        (this.category === 'all-core' && this.type !== 'init')) {
      return
    }

    const platformPath = getPlatformPath(systemInfo)
    const { pathSeparator, mainDirectory } = systemInfo

    let relfile = platformPath.relative(mainDirectory, this.fileName)

    if (relfile[0] !== '.') {
      relfile = `.${pathSeparator}${relfile}`
    }

    this.fileName = relfile
    this.name = `${this.functionName} ${relfile}:${this.lineNumber}:${this.columnNumber}`
  }

  format (systemInfo) {
    this.anonymise(systemInfo)
    this.target = this.getTarget(systemInfo) // Optional; where a user can view the source (e.g. path, url...)
  }

  // Formats file and function names, for user-friendly regexes
  // This cannot be done in the constructor because we don't know the node category yet.
  formatRegExpName () {
    // Regex may contain any number of spaces; wrap in / / to show whitespace
    this.functionName = `/${this.name.replace(/ \[CODE:RegExp\].*$/, '')}/`
    this.fileName = '[CODE:RegExp]'
  }

  walk (visit) {
    visit(this)
    this.children.forEach((node) => {
      node.walk(visit)
    })
  }

  toJSON () {
    return {
      id: this.id,
      name: this.name,
      fileName: this.fileName,
      functionName: this.functionName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      target: this.target || '',

      type: this.type,
      typeTEMP: this.typeTEMP, // Temporary until d3-fg custom property filter complete
      category: this.category,

      isOptimised: this.isOptimised,
      isOptimisable: this.isOptimisable,
      isInlinable: this.isInlinable,
      isInit: this.isInit,

      value: this.onStack,
      stackTop: this.onStackTop,
      children: this.children.map((node) => node.toJSON())
    }
  }
}

function getEscapedSeperator (systemInfo) {
  const { pathSeparator } = systemInfo
  /* istanbul ignore next: platform-specific conditions */
  return pathSeparator === '/' ? '\\/' : '\\\\'
}

function getPlatformPath (systemInfo) {
  return systemInfo.pathSeparator === '\\' ? path.win32 : path.posix
}

module.exports = FrameNode
