const path = require('path')

const frameRx = /^(\S+) (?:native )?(.*?):(\d+):(\d+)$/
class FrameNode {
  constructor (data) {
    this.id = null
    this.name = data.name
    this.onStack = data.value
    this.onStackTop = { base: data.top }
    this.children = data.children
      ? data.children.map((frame) => new FrameNode(frame))
      : []

    // C++ and v8 functions don't match, but they don't need to
    const m = frameRx.exec(this.name)
    if (m) {
      const [
        input, // eslint-disable-line no-unused-vars
        functionName,
        fileName,
        lineNumber,
        columnNumber
      ] = m
      this.functionName = functionName
      this.fileName = fileName
      this.fullFileName = fileName
      this.lineNumber = parseInt(lineNumber, 10)
      this.columnNumber = parseInt(columnNumber, 10)
    } else {
      this.functionName = null
      this.fileName = null
      this.fullFileName = null
      this.lineNumber = null
      this.columnNumber = null
    }
  }

  isNodeCore (systemInfo) {
    const { fullFileName } = this
    const { pathSeparator } = systemInfo

    // istanbul ignore if
    if (!fullFileName) {
      return false
    }

    const pathPlatform = pathSeparator === '\\' ? path.win32 : path.posix
    return !pathPlatform.isAbsolute(fullFileName)
  }

  isNodeModule (systemInfo) {
    const { fileName } = this
    const { pathSeparator } = systemInfo

    return fileName && fileName.includes(`${pathSeparator}node_modules${pathSeparator}`)
  }

  categorise (systemInfo) {
    const { name } = this

    if (/\[INIT]$/.test(name)) {
      this.type = 'init'
    } else if (/\[INLINABLE]$/.test(name)) {
      this.type = 'inlinable'
    } else if (!/\.m?js/.test(name)) {
      if (/\[CODE:RegExp]$/.test(name)) {
        this.type = 'regexp'
      } else if (/\[CODE:.*?]$/.test(name) || /v8::internal::.*\[CPP]$/.test(name)) {
        this.type = 'v8'
      } else /* istanbul ignore next */ if (/\.$/.test(name)) {
        this.type = 'core'
      } else if (/\[CPP]$/.test(name) || /\[SHARED_LIB]$/.test(name)) {
        this.type = 'cpp'
      } else if (/\[eval]/.test(name)) {
        // unless we create an eval checkbox
        // "native" is the next best label since
        // you cannot tell where the eval comes
        // from (app, deps, core)
        this.type = 'native'
      } else {
        this.type = 'v8'
      }
    } else if (/ native /.test(name)) {
      this.type = 'native'
    } else if (this.isNodeCore(systemInfo)) {
      this.type = 'core'
    } else if (this.isNodeModule(systemInfo)) {
      this.type = 'deps'
    } else {
      this.type = 'app'
    }
  }

  anonymise (systemInfo) {
    if (!this.fileName || this.isNodeCore(systemInfo)) return

    const { pathSeparator, mainDirectory } = systemInfo

    const platformPath = pathSeparator === '\\' ? path.win32 : path.posix
    let relfile = platformPath.relative(mainDirectory, this.fileName)
    if (relfile[0] !== '.') {
      relfile = `.${pathSeparator}${relfile}`
    }

    this.fileName = relfile
    // TODO move this to something like a format() function
    this.name = `${this.functionName} ${relfile}:${this.lineNumber}:${this.columnNumber}`
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
      type: this.type,
      value: this.onStack,
      stackTop: this.onStackTop,
      children: this.children.map((node) => node.toJSON())
    }
  }
}

module.exports = FrameNode
