const test = require('tap').test
const FrameNode = require('../analysis/frame-node.js')
const {
  isNodeExcluded,
  defaultExclude
} = require('../shared.js')

const linux = {
  mainDirectory: '/root',
  pathSeparator: '/',
  nodeVersions: { node: '8.13.0' }
}

const windows = {
  mainDirectory: 'C:\\Documents\\Contains spaces',
  pathSeparator: '\\',
  nodeVersions: { node: '8.13.0' }
}

const mac = {
  mainDirectory: '/Users/username/code/repo',
  pathSeparator: '/',
  nodeVersions: { node: '16.19.1' }
}

function byProps (properties, sysinfo, appName = 'some-app') {
  const node = new FrameNode(properties)
  node.categorise(sysinfo, appName)
  return node
}

test('analysis - categorise node names', (t) => {
  function byName (name, sysinfo, appName) {
    const { type } = byProps({ name }, sysinfo, appName)
    return type
  }

  t.match(byProps({ name: 'NativeModule.compile internal/bootstrap/loaders.js:236:44 [INIT]' }, linux), {
    category: 'core',
    type: 'core',
    isInit: true,
    isInlinable: false
  })
  t.match(byProps({ name: '~(anonymous) /home/username/.npm/prefix/lib/node_modules/clinic/node_modules/0x/lib/preload/no-cluster.js:1:11 [INIT]' }, linux), {
    category: 'deps',
    type: 'clinic',
    isInit: true,
    isInlinable: false
  })
  t.match(byProps({ name: '~getMediaTypePriority /root/0x/examples/rest-api/node_modules/negotiator/lib/mediaType.js:99:30 [INLINABLE]' }, linux), {
    category: 'deps',
    type: 'negotiator',
    isInit: false,
    isInlinable: true
  })
  t.match(byProps({ name: '~walk /home/username/dash-ast/index.js:26:15 [INLINABLE]' }, linux, 'dash-ast'), {
    category: 'app',
    type: 'dash-ast',
    isInit: false,
    isInlinable: true
  })
  t.match(byProps({ name: 'wasm-function[0] [WASM:Opt]' }, linux), {
    category: 'wasm',
    type: 'wasm',
    fileName: null,
    isOptimized: true
  })
  t.match(byProps({ name: 'wasm-to-js:iii:i [WASM:Builtin]' }, linux), {
    category: 'wasm',
    type: 'wasm'
  })
  t.match(byProps({ name: 'wasm-to-js:iiii:i-0-turbofan [WASM]' }, linux), {
    category: 'wasm',
    type: 'wasm'
  })
  t.match(byProps({ name: 'ressa::Parser<CH>::parse_statement_list_item::ha21ba52d257287dd [WASM:Opt]' }, linux), {
    category: 'wasm',
    type: 'wasm',
    fileName: null,
    isOptimized: true
  })
  t.match(byProps({ name: '(anonymous) node:internal/console/constructor:342:10' }, linux), {
    category: 'core',
    type: 'core'
  })
  t.match(byProps({ name: '(anonymous) node:internal/console/constructor:342:10' }, windows), {
    category: 'core',
    type: 'core'
  })
  t.match(byProps({ name: 'node::AsyncWrap::MakeCallback [CPP]' }, linux), {
    category: 'all-v8',
    type: 'cpp'
  })
  t.match(byProps({ name: '^etag /home/username/app/etag.js:26' }, linux), {
    category: 'app',
    type: 'some-app'
  })
  t.match(byProps({ name: '(anonymous) file:///Users/username/code/repo/server.js:7:14' }, mac), {
    category: 'app',
    type: 'some-app'
  })
  t.match(byProps({ name: 'payload file:///Users/username/code/repo/lib/init.js:3:26' }, mac), {
    category: 'app',
    type: 'some-app'
  })

  t.equal(byName('/usr/bin/node [SHARED_LIB]', linux), 'cpp')
  t.equal(byName('C:\\Program Files\\nodejs\\node.exe [SHARED_LIB]', windows), 'cpp')
  t.equal(byName('v8::internal::Runtime_CompileLazy(int, v8::internal::Object**, v8::internal::Isolate*) [CPP]', linux), 'v8')
  t.equal(byName('Call_ReceiverIsNotNullOrUndefined [CODE:Builtin]', linux), 'v8')
  t.equal(byName('NativeModule.require internal/bootstrap/loaders.js:140:34', linux), 'core')
  t.equal(byName('_run /root/0x/examples/rest-api/node_modules/restify/lib/server.js:807:38', linux), 'restify')
  t.equal(byName('(anonymous) /root/0x/examples/rest-api/etag.js:1:11', linux, 'rest-api'), 'rest-api')
  t.equal(byName('(anonymous) C:\\Documents\\Contains spaces\\0x\\examples\\rest-api\\etag.js:1:11', windows), 'some-app')
  t.equal(byName('InnerArraySort native array.js:486:24', linux), 'native')
  t.equal(byName('[\u0000zA-Z\u0000#$%&\'*+.|~]+$ [CODE:RegExp]', linux), 'regexp')
  t.equal(byName('(anonymous) file:///Users/username/code/repo/server.js:7:14', mac), 'some-app')
  t.equal(byName('payload file:///Users/username/code/repo/lib/init.js:3:26', mac), 'some-app')

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
  }, windows, 'Contains spaces')

  customNode.format(windows)

  t.equal(customNode.category, 'app')
  t.equal(customNode.type, 'Contains spaces')
  t.equal(customNode.functionName, 'Unexpected multiple customFlags')
  t.equal(customNode.fileName, '.\\sub_dir\\index.js')
  t.notOk(customNode.isOptimized)
  t.ok(customNode.isUnoptimized)
  t.notOk(dataTree.isNodeExcluded(customNode))

  const depNode = byProps({
    name: '*Funcname C:\\Documents\\Contains spaces\\node_modules\\some-module\\index.js:1:2'
  }, windows)

  depNode.format(windows)

  t.equal(depNode.category, 'deps')
  t.equal(depNode.type, 'some-module')
  t.equal(depNode.functionName, 'Funcname')
  t.equal(depNode.fileName, '.\\node_modules\\some-module\\index.js')
  t.equal(depNode.lineNumber, 1)
  t.equal(depNode.columnNumber, 2)
  t.ok(depNode.isOptimized)
  t.notOk(depNode.isUnoptimized)
  t.notOk(dataTree.isNodeExcluded(depNode))
  dataTree.exclude.add('deps')
  t.ok(dataTree.isNodeExcluded(depNode))

  // Format regular expressions
  const regexpNode = byProps({
    name: '[\u0000zA-Z\u0000#$%&\'*+.|~]+$ [CODE:RegExp]'
  }, windows)

  regexpNode.format(windows)

  t.equal(regexpNode.category, 'all-v8')
  t.equal(regexpNode.type, 'regexp')
  t.equal(regexpNode.functionName, '/[\u0000zA-Z\u0000#$%&\'*+.|~]+$/')
  t.equal(regexpNode.fileName, '[CODE:RegExp]')
  t.notOk(regexpNode.isOptimized)
  t.notOk(regexpNode.isUnoptimized)
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
  t.notOk(inlinableNode.isOptimized)
  t.notOk(inlinableNode.isUnoptimized)
  t.notOk(dataTree.isNodeExcluded(inlinableNode))
  dataTree.exclude.add('is:inlinable')
  t.ok(dataTree.isNodeExcluded(inlinableNode))

  const initNode = byProps({
    name: '*Funcname /root/0x/examples/dummy.js:1:1 [INIT]'
  }, windows)

  initNode.format(linux)

  t.equal(initNode.functionName, 'Funcname')
  t.equal(initNode.fileName, './0x/examples/dummy.js')
  t.ok(initNode.isInit)
  t.notOk(initNode.isInlinable)
  t.ok(initNode.isOptimized)
  t.notOk(initNode.isUnoptimized)

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

  const builtinInitWASM = byProps({
    name: 'wasm-to-js:iii:i [WASM:Builtin] [INIT]'
  }, linux)

  builtinInitWASM.format(linux)

  t.equal(builtinInitWASM.functionName, 'wasm-to-js:iii:i')
  t.equal(builtinInitWASM.fileName, null)
  t.ok(builtinInitWASM.isInit)

  const perfLine = byProps({
    name: '^etag /home/username/lib/etag.js:9'
  }, linux)

  perfLine.format(linux)

  t.equal(perfLine.functionName, 'etag')
  t.equal(perfLine.fileName, '../home/username/lib/etag.js')
  t.notOk(perfLine.isInlinable)
  t.notOk(perfLine.isInit)
  t.notOk(perfLine.isOptimized)
  t.ok(perfLine.isUnoptimized)

  t.end()
})

test('do not crash on RegExp nodes', (t) => {
  const regexpNode = new FrameNode({
    name: '\\.js(\\?[^.]+)?$ [CODE:RegExp]'
  })
  regexpNode.categorise(windows)
  t.equal(regexpNode.type, 'regexp')
  t.end()
})
