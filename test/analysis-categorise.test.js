const test = require('tap').test
const FrameNode = require('../analysis/frame-node.js')

test('analysis - categorise nodes', (t) => {
  function c (name, sysinfo) {
    const node = new FrameNode({ name })
    node.categorise(sysinfo)
    return node.type
  }

  const linux = {
    mainDirectory: '/root',
    pathSeparator: '/'
  }

  t.equal(c('NativeModule.compile internal/bootstrap/loaders.js:236:44 [INIT]', linux), 'init')
  t.equal(c('~getMediaTypePriority /root/0x/examples/rest-api/node_modules/negotiator/lib/mediaType.js:99:30 [INLINABLE]', linux), 'inlinable')
  t.equal(c('/usr/bin/node [SHARED_LIB]', linux), 'cpp')
  t.equal(c('v8::internal::Runtime_CompileLazy(int, v8::internal::Object**, v8::internal::Isolate*) [CPP]', linux), 'v8')
  t.equal(c('Call_ReceiverIsNotNullOrUndefined [CODE:Builtin]', linux), 'v8')
  t.equal(c('NativeModule.require internal/bootstrap/loaders.js:140:34', linux), 'core')
  t.equal(c('_run /root/0x/examples/rest-api/node_modules/restify/lib/server.js:807:38', linux), 'deps')
  t.equal(c('(anonymous) /root/0x/examples/rest-api/etag.js:1:11', linux), 'app')
  t.equal(c('InnerArraySort native array.js:486:24', linux), 'native')
  t.equal(c('[\u0000zA-Z\u0000#$%&\'*+.|~]+$ [CODE:RegExp]', linux), 'regexp')
  t.end()
})
