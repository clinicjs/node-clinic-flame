const test = require('tap').test
const FrameNode = require('../analysis/frame-node.js')
const {
  isNodeExcluded,
  defaultExclude
} = require('../shared.js')

const linux = {
  mainDirectory: '/root',
  pathSeparator: '/'
}

const windows = {
  mainDirectory: 'C:\\Documents\\Contains spaces',
  pathSeparator: '\\'
}

function byProps (properties, sysinfo) {
  const node = new FrameNode(properties)
  node.categorise(sysinfo)
  return node
}

test('analysis - categorise node names', (t) => {
  function byName (name, sysinfo) {
    const { type } = byProps({ name }, sysinfo)
    return type
  }

  t.equal(byName('NativeModule.compile internal/bootstrap/loaders.js:236:44 [INIT]', linux), 'init')
  t.equal(byName('~getMediaTypePriority /root/0x/examples/rest-api/node_modules/negotiator/lib/mediaType.js:99:30 [INLINABLE]', linux), 'deps')
  t.equal(byName('/usr/bin/node [SHARED_LIB]', linux), 'cpp')
  t.equal(byName('C:\\Program Files\\nodejs\\node.exe [SHARED_LIB]', windows), 'cpp')
  t.equal(byName('v8::internal::Runtime_CompileLazy(int, v8::internal::Object**, v8::internal::Isolate*) [CPP]', linux), 'v8')
  t.equal(byName('Call_ReceiverIsNotNullOrUndefined [CODE:Builtin]', linux), 'v8')
  t.equal(byName('ArrayFilter [CODE:Builtin] [INIT]'), 'init')
  t.equal(byName('NativeModule.require internal/bootstrap/loaders.js:140:34', linux), 'core')
  t.equal(byName('_run /root/0x/examples/rest-api/node_modules/restify/lib/server.js:807:38', linux), 'deps')
  t.equal(byName('(anonymous) /root/0x/examples/rest-api/etag.js:1:11', linux), 'app')
  t.equal(byName('(anonymous) C:\\Documents\\Contains spaces\\0x\\examples\\rest-api\\etag.js:1:11', windows), 'app')
  t.equal(byName('InnerArraySort native array.js:486:24', linux), 'native')
  t.equal(byName('[\u0000zA-Z\u0000#$%&\'*+.|~]+$ [CODE:RegExp]', linux), 'regexp')

  t.end()
})

test('analysis - categorise node properties', (t) => {
  class DummyDataTree {
    constructor () {
      this.exclude = defaultExclude
      this.isNodeExcluded = isNodeExcluded.bind(this)
    }
  }
  const dataTree = new DummyDataTree()

  // Handle multiple unexpected custom flags
  const customNode = byProps({
    name: '~Unexpected multiple customFlags C:\\Documents\\Contains spaces\\sub_dir\\index.js:1:1'
  }, windows)

  customNode.format(windows)

  t.equal(customNode.category, 'app')
  t.equal(customNode.typeTEMP, 'Contains spaces\\sub_dir')
  t.equal(customNode.functionName, 'Unexpected multiple customFlags')
  t.equal(customNode.fileName, '.\\sub_dir\\index.js')
  t.ok(customNode.isOptimised)
  t.notOk(customNode.isOptimisable)
  t.notOk(dataTree.isNodeExcluded(customNode))

  const depNode = byProps({
    name: '*Funcname C:\\Documents\\Contains spaces\\node_modules\\some-module\\index.js:1:2'
  }, windows)

  depNode.format(windows)

  t.equal(depNode.category, 'deps')
  t.equal(depNode.typeTEMP, 'some-module')
  t.equal(depNode.functionName, 'Funcname')
  t.equal(depNode.fileName, '.\\node_modules\\some-module\\index.js')
  t.equal(depNode.lineNumber, 1)
  t.equal(depNode.columnNumber, 2)
  t.notOk(depNode.isOptimised)
  t.ok(depNode.isOptimisable)
  t.notOk(dataTree.isNodeExcluded(depNode))
  dataTree.exclude.add('deps')
  t.ok(dataTree.isNodeExcluded(depNode))

  // Format regular expressions
  const regexpNode = byProps({
    name: '[\u0000zA-Z\u0000#$%&\'*+.|~]+$ [CODE:RegExp]'
  }, windows)

  regexpNode.format(windows)

  t.equal(regexpNode.category, 'all-core')
  t.equal(regexpNode.type, 'regexp')
  t.equal(regexpNode.functionName, '/[\u0000zA-Z\u0000#$%&\'*+.|~]+$/')
  t.equal(regexpNode.fileName, '[CODE:RegExp]')
  t.notOk(regexpNode.isOptimised)
  t.notOk(regexpNode.isOptimisable)
  t.ok(dataTree.isNodeExcluded(regexpNode))

  // Handle INIT and INLINABLE frames
  // (temporary quick coverage because INIT / INLINABLE types are to be replaced with flags)
  const inlinableNode = byProps({
    name: 'Funcname /root/0x/examples/dummy.js:1:1 [INLINABLE]'
  }, windows)

  inlinableNode.format(linux)

  t.equal(inlinableNode.functionName, 'Funcname')
  t.equal(inlinableNode.fileName, './0x/examples/dummy.js')
  t.ok(inlinableNode.isInlinable)
  t.notOk(inlinableNode.isInit)
  t.notOk(inlinableNode.isOptimised)
  t.notOk(inlinableNode.isOptimisable)
  t.notOk(dataTree.isNodeExcluded(inlinableNode))
  dataTree.exclude.add('inlinable')
  t.ok(dataTree.isNodeExcluded(inlinableNode))

  const initNode = byProps({
    name: '*Funcname /root/0x/examples/dummy.js:1:1 [INIT]'
  }, windows)

  initNode.format(linux)

  t.equal(initNode.functionName, 'Funcname')
  t.equal(initNode.fileName, './0x/examples/dummy.js')
  t.ok(initNode.isInit)
  t.notOk(initNode.isInlinable)
  t.notOk(initNode.isOptimised)
  t.ok(initNode.isOptimisable)

  t.ok(dataTree.isNodeExcluded(initNode))

  const sharedNode = byProps({
    name: 'C:\\Program Files\\nodejs\\node.exe [SHARED_LIB]'
  }, windows)

  sharedNode.format(windows)

  t.equal(sharedNode.functionName, '[SHARED_LIB]')
  t.equal(sharedNode.fileName, 'C:\\Program Files\\nodejs\\node.exe')

  const cppNode = byProps({
    name: 'v8::internal::Runtime_CompileLazy(int, v8::internal::Object**, v8::internal::Isolate*) [CPP]'
  }, windows)

  cppNode.format(windows)

  t.equal(cppNode.functionName, 'v8::internal::Runtime_CompileLazy(int, v8::internal::Object**, v8::internal::Isolate*)')
  t.equal(cppNode.fileName, null)

  const builtinNode = byProps({
    name: 'Call_ReceiverIsNotNullOrUndefined [CODE:Builtin]'
  }, linux)

  builtinNode.format(linux)

  t.equal(builtinNode.functionName, 'Call_ReceiverIsNotNullOrUndefined')
  t.equal(builtinNode.fileName, null)

  const builtinInitNode = byProps({
    name: 'ArrayFilter [CODE:Builtin] [INIT]'
  }, linux)

  builtinInitNode.format(linux)

  t.equal(builtinInitNode.functionName, 'ArrayFilter')
  t.equal(builtinInitNode.fileName, null)
  t.ok(builtinInitNode.isInit)

  t.end()
})
