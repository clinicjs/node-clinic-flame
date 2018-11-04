const test = require('tap').test
const FrameNode = require('../analysis/frame-node.js')
const addStackTopValues = require('../analysis/add-stack-top-values.js')

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
    stackTop: { base: 10 },
    children: [{
      stackTop: { base: 25 }
    }]
  }

  addStackTopValues(tree)
  t.match(tree.toJSON(), expected)

  t.end()
})

test('analysis - stack top - nested', (t) => {
  // When hiding a stack type, eg. 'cpp', it has an effect on the number of samples where its parent stack frames were at the top of the stack.
  // Eg if a JS function called into C++, that JS function would now visually be at the top of the stack, for the duration of that C++ function call.
  // If C++ calls back into JS, that next JS function will still be on top as usual. If _that_ function calls back into C++, the C++ top time should be added to the topmost JS function, but not the initial JS function.
  // If C++ calls other C++ functions directly, those will also be hidden and should also be counted as "top of stack" samples for the closest JS function.
  // Essentially, all child C++ frames should be summed, _so long as_ they don't cross over a category boundary (eg. back into JS).

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
    stackTop: { base: 10, app: 25, cpp: 718 },
    children: [{
      // test2
      stackTop: { base: 25, cpp: 3 },
      children: [{
        stackTop: { base: 3 }
      }]
    }, {
      stackTop: { base: 700, app: 60, cpp: 18 },
      children: [{
        stackTop: { base: 18 }
      }, {
        // test3
        stackTop: { base: 60, cpp: 10000 },
        children: [{
          stackTop: { base: 10000 }
        }]
      }]
    }]
  }

  addStackTopValues(tree)
  t.match(tree.toJSON(), expected)

  t.end()
})
