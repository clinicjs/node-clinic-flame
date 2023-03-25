const path = require('path')

const jsFrameRx = /^([~*^])?((?:\S+?\(anonymous function\)|\S+)?(?: [a-zA-Z]+)*) (.*?):(\d+)?:?(\d+)( \[INIT])?( \[INLINABLE])?$/
const wasmFrameRx = /^(.*?) \[WASM:?(\w+)?]( \[INIT])?$/
// This one has the /m flag because regexes may contain \n
const cppFrameRx = /^(.*) (\[CPP]|\[SHARED_LIB]|\[CODE:\w+])( \[INIT])?$/m

class FrameNode {
  constructor (data, fixedType = null) {
    this.id = null

    /* istanbul ignore next: must be a string; can be null but can't replicate in tests */
    // If backslashes have been hard-escaped as their unicode escape char, swap them back in
    this.name = data.name
      .replace(/\\u005c/g, '\\')
      .replace('\n', ' /') || ''

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

    this.isInit = false
    this.isInlinable = false
    this.isOptimized = false
    this.isUnoptimized = false

    // Don't try to identify anything for the root node
    if (fixedType) {
      this.category = 'none'
      this.type = fixedType
      return this
    }

    // C++ and v8 functions don't match, but they don't need to
    let m
    if ((m = this.name.match(jsFrameRx))) {
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
      this.isOptimized = optimizationFlag === '*'
      this.isUnoptimized = optimizationFlag === '~' || optimizationFlag === '^'
    } else if ((m = this.name.match(cppFrameRx))) {
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
      /* istanbul ignore else: if none of the regexes we are missing a feature */
      if ((m = this.name.match(wasmFrameRx))) {
        const [
          input, // eslint-disable-line no-unused-vars
          functionName,
          optimizationTag,
          isInit
        ] = m
        this.functionName = functionName
        this.fileName = null
        this.isInit = isInit != null
        this.isOptimized = optimizationTag === 'Opt'
        this.isUnoptimized = optimizationTag === 'Unopt'
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

  categorise (systemInfo, appName) {
    if (this.category === 'none') return
    const { name } = this // this.name remains unmutated: the initial name returned by 0x

    const {
      category,
      type
    } = this.getESMAppType(name, appName) ||
      this.getWasmType(name) ||
      this.getCoreOrV8Type(name, systemInfo) ||
      this.getDepType(name, systemInfo) ||
      this.getAppType(name, appName)

    this.category = category // Top level filters: 'app', 'deps', 'core' or 'all-v8'
    this.type = type // Second-level filters; core are static, app and deps depend on app

    if (type === 'regexp') {
      this.formatRegExpName()
    }
  }

  getTarget (systemInfo) {
    // App and its dependencies have local file paths; use those
    if (this.category === 'app' || this.category === 'deps') {
      return this.fileName
    }

    // Some core types have files that can be linked to in the appropriate Node build
    if (this.type === 'core') {
      const nodeVersion = systemInfo.nodeVersions.node
      return `https://github.com/nodejs/node/blob/v${nodeVersion}/lib/${this.fileName}#L${this.lineNumber}`
    }

    // TODO: add more cases like this
  }

  getWasmType (name) {
    if (/\[WASM(:\w+)?]( \[INIT])?$/.test(name)) {
      return { type: 'wasm', category: 'wasm' }
    }
    return null
  }

  getESMAppType (name, appName) {
    if (/.+file:\/\/.+\.js/.test(name)) {
      return this.getAppType(name, appName)
    }
    return null
  }

  getCoreOrV8Type (name, systemInfo) {
    // TODO: see if any subdivisions of core are useful
    const core = { type: 'core', category: 'core' }

    let type

    if (/\[CODE:RegExp]$/.test(name)) {
      type = 'regexp'
    } else if (!/(\.m?js)|(node:\w)/.test(name)) {
      if (/\[CODE:.*?]$/.test(name) || /v8::internal::.*\[CPP]$/.test(name)) {
        type = 'v8'
      } else /* istanbul ignore next */ if (/\.$/.test(name)) {
        return core
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
      return core
    }

    return type
      ? { type, category: 'all-v8' }
      : null
  }

  getDepType (name, systemInfo) {
    const escSep = getEscapedSeperator(systemInfo)
    const nodeModules = `${escSep}node_modules${escSep}`
    // Get last folder name after a /node_modules/ or \node_modules\
    const depDirRegex = new RegExp(`${nodeModules}(.+?)${escSep}(?!.*${nodeModules})`)

    const match = name.match(depDirRegex)
    return match
      ? { type: match[1], category: 'deps' }
      : null
  }

  getAppType (name, appName) {
    return {
      // TODO: profile some large applications with a lot of app code, see if there's a useful heuristic to split
      // out types, e.g. folders containing more than n files or look for common patterns like `lib`
      type: appName,
      category: 'app'
    }
  }

  anonymise (systemInfo) {
    if (!this.fileName || this.isNodeCore(systemInfo) || this.category === 'all-v8') {
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
    if (this.category === 'none') return
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
    // Used for search matching. '(inlinable)' added at start without spaces based on d3-fg search string parsing
    /* istanbul ignore next: inlinability is not always consistent between runs of the same test */
    const name = this.isInlinable ? '(inlinable)' + this.name : this.name

    return {
      id: this.id,

      name,

      fileName: this.fileName,
      functionName: this.functionName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      target: this.target || '',

      type: this.type,
      category: this.category,

      isOptimized: this.isOptimized,
      isUnoptimized: this.isUnoptimized,
      isInlinable: this.isInlinable,
      isInit: this.isInit,
      isWasm: this.isWasm,

      value: this.onStack,
      onStackTop: this.onStackTop,
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
