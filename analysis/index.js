const fs = require('fs')
const { promisify } = require('util')
const ticksToTree = require('0x/lib/ticks-to-tree')
const FrameNode = require('./frame-node.js')
const labelNodes = require('./label-nodes.js')
const addStackTopValues = require('./add-stack-top-values.js')

const readFile = promisify(fs.readFile)

async function analyse (paths) {
  const [ systemInfo, ticks, inlined ] = await Promise.all([
    readFile(paths['/systeminfo'], 'utf8').then(JSON.parse),
    readFile(paths['/samples'], 'utf8').then(JSON.parse),
    readFile(paths['/inlinedfunctions'], 'utf8').then(JSON.parse)
  ])

  const steps = [
    (tree) => labelNodes(tree),
    (tree) => tree.walk((node) => node.categorise(systemInfo)),
    (tree) => tree.walk((node) => node.anonymise(systemInfo)),
    (tree) => addStackTopValues(tree)
  ]

  const trees = ticksToTree(ticks, { inlined })
  const merged = new FrameNode(trees.merged)
  const unmerged = new FrameNode(trees.unmerged)
  steps.forEach((step) => {
    step(merged)
    step(unmerged)
  })
  return { merged, unmerged }
}

module.exports = analyse
