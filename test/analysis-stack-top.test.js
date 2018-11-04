const test = require('tap').test
const FrameNode = require('../analysis/frame-node.js')
const {
  setStackTop,
  defaultExclude
} = require('../shared.js')

test('analysis - stack top - base value is node.top', (t) => {
  const tree = new FrameNode({
    name: 'test /home/app/project/app.js:10:1',
    top: 10,
    children: [{
      name: 'test2 /home/app/project/app.js:12:1',
      top: 25
    }]
  })
  tree.walk((node) => node.categorise({
    mainDirectory: '/home/app/project',
    pathSeparator: '/'
  }))

  const expected = {
    onStackTop: { base: 10 },
    children: [{
      onStackTop: { base: 25 }
    }]
  }

  setStackTop(tree, defaultExclude)
  t.match(tree.toJSON(), expected)

  t.end()
})

test('analysis - stack top - nested - bound', (t) => {
  // When hiding a stack type, eg. 'cpp', it has an effect on the number of samples where its parent stack frames were at the top of the stack.
  // Eg if a JS function called into C++, that JS function would now visually be at the top of the stack, for the duration of that C++ function call.
  // If C++ calls back into JS, that next JS function will still be on top as usual. If _that_ function calls back into C++, the C++ top time should be added to the topmost JS function, but not the initial JS function.
  // If C++ calls other C++ functions directly, those will also be hidden and should also be counted as "top of stack" samples for the closest JS function.
  // Essentially, all child C++ frames should be summed, _so long as_ they don't cross over a category boundary (eg. back into JS).

  class DummyDataTree {
    constructor () {
      this.exclude = defaultExclude
      this.setStackTop = setStackTop.bind(this)
    }
  }

  const tree = new FrameNode({
    name: 'test /home/app/project/app.js:10:1',
    top: 10,
    children: [{
      name: 'test2 /home/app/project/app.js:12:1',
      top: 25,
      // should NOT be added to frame `test`
      // SHOULD be added to frame `test2`
      children: [{
        name: 'abc abc.cpp:2:1 [CPP]',
        top: 3
      }]
    }, {
      // SHOULD be added to frame `test`
      name: 'xyz xyz.cpp:1:1 [CPP]',
      top: 700,
      children: [{
        name: 'xyz xyz.cpp:1:1 [CPP]',
        top: 18
      }, {
        // should NOT be added to frame `test`
        name: 'test3 /home/app/project/app.js:14:1',
        top: 60,
        children: [{
          name: 'lol lol.cpp:1:1 [CPP]',
          top: 10000
        }]
      }]
    }]
  })
  tree.walk((node) => node.categorise({
    mainDirectory: '/home/app/project',
    pathSeparator: '/'
  }))

  const expected = {
    // test
    onStackTop: { base: 10, asViewed: 728 },
    children: [{
      // test2
      onStackTop: { base: 25, asViewed: 28 },
      children: [{
        onStackTop: { base: 3, asViewed: 0 }
      }]
    }, {
      onStackTop: { base: 700, asViewed: 0 },
      children: [{
        onStackTop: { base: 18, asViewed: 0 }
      }, {
        // test3
        onStackTop: { base: 60, asViewed: 10060 },
        children: [{
          onStackTop: { base: 10000, asViewed: 0 }
        }]
      }]
    }]
  }

  const dataTree = new DummyDataTree()
  dataTree.setStackTop(tree)
  t.match(tree.toJSON(), expected)

  t.end()
})
