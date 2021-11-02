const test = require('tap').test
const FrameNode = require('../analysis/frame-node.js')

test('analysis - anonymise nodes - remove mainDir in app code', (t) => {
  const sysinfo = {
    mainDirectory: '/home/clinic/code/app',
    pathSeparator: '/'
  }

  const appNode = new FrameNode({
    name: 'start /home/clinic/code/app/index.js:20:1'
  })
  appNode.anonymise(sysinfo)
  t.equal(appNode.name, 'start ./index.js:20:1')

  const windowsAppNode = new FrameNode({
    name: 'start c:\\users\\clinic\\code\\app\\index.js:20:1'
  })
  windowsAppNode.anonymise({
    mainDirectory: 'c:\\users\\clinic\\code\\app',
    pathSeparator: '\\'
  })
  t.equal(windowsAppNode.name, 'start .\\index.js:20:1')

  const nodeCoreNode = new FrameNode({
    name: 'coreFunction util.js:15:7'
  })
  nodeCoreNode.anonymise(sysinfo)
  t.equal(nodeCoreNode.name, 'coreFunction util.js:15:7')

  const nativeNode = new FrameNode({
    name: 'join native array.js:280:46'
  })
  nativeNode.anonymise(sysinfo)
  t.equal(nativeNode.name, 'join native array.js:280:46')

  const parentDirNode = new FrameNode({
    name: '(anonymous) /home/clinic/code/browserify/index.js:808:29'
  })
  parentDirNode.anonymise(sysinfo)
  t.equal(parentDirNode.name, '(anonymous) ../browserify/index.js:808:29')

  const anonymousFunctionNode = new FrameNode({
    name: 'module.exports.(anonymous function) /home/clinic/code/app/node_modules/restify/lib/errors/rest_error.js:33:50'
  })
  anonymousFunctionNode.anonymise(sysinfo)
  t.equal(anonymousFunctionNode.name, 'module.exports.(anonymous function) ./node_modules/restify/lib/errors/rest_error.js:33:50')

  t.end()
})

test('analysis - anonymise nodes - recursive', (t) => {
  const sysinfo = {
    mainDirectory: '/home/clinic/code/app',
    pathSeparator: '/'
  }

  const tree = new FrameNode({
    name: 'start /home/clinic/code/app/index.js:20:1',
    children: [
      {
        name: 'build /home/clinic/code/app/node_modules/fastify/fastify.js:40:1',
        children: [
          { name: 'createServer http.js:36:1' }
        ]
      }
    ]
  })

  const expected = {
    name: 'start ./index.js:20:1',
    children: [
      {
        name: 'build ./node_modules/fastify/fastify.js:40:1',
        children: [
          { name: 'createServer http.js:36:1' }
        ]
      }
    ]
  }

  tree.walk((node) => node.anonymise(sysinfo))
  t.match(tree.toJSON(), expected)

  t.end()
})
