const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const ticksToTree = require('0x/lib/ticks-to-tree')
const FrameNode = require('./frame-node.js')
const labelNodes = require('./label-nodes.js')
const {
  setStackTop,
  defaultExclude
} = require('../shared.js')

const readFile = promisify(fs.readFile)

async function analyse (paths) {
  const [ systemInfo, ticks, inlined ] = await Promise.all([
    readFile(paths['/systeminfo'], 'utf8').then(JSON.parse),
    readFile(paths['/samples'], 'utf8').then(JSON.parse),
    readFile(paths['/inlinedfunctions'], 'utf8').then(JSON.parse)
  ])

  /* istanbul ignore next */
  const platformPath = systemInfo.pathSeparator === '\\' ? path.win32 : path.posix
  const appName = platformPath.basename(systemInfo.mainDirectory)
  const pathSeparator = systemInfo.pathSeparator

  const codeAreas = [
    { id: 'app' },
    { id: 'deps' },
    { id: 'core' },
    { id: 'all-v8',
      children: [
        { id: 'v8' },
        { id: 'native' },
        { id: 'cpp' },
        { id: 'regexp' }
      ],
      childrenVisibilityToggle: true }
  ]

  codeAreas.forEach(area => {
    area.excludeKey = area.id
    if (area.children) {
      area.children.forEach(childArea => {
        childArea.excludeKey = `${area.id}:${childArea.id}`
      })
    }
  })

  const steps = [
    (tree) => labelNodes(tree),
    (tree) => tree.walk((node) => {
      node.categorise(systemInfo)
      node.format(systemInfo)
    }),
    (tree) => setStackTop(tree, defaultExclude)
  ]

  const trees = ticksToTree(ticks, { inlined })
  const merged = new FrameNode(trees.merged)
  const unmerged = new FrameNode(trees.unmerged)
  steps.forEach((step) => {
    step(merged)
    step(unmerged)
  })

  return {
    appName,
    pathSeparator,
    codeAreas,
    merged,
    unmerged
  }
}

module.exports = analyse
