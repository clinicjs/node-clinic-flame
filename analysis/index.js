const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const ticksToTree = require('0x/lib/ticks-to-tree')
const FrameNode = require('./frame-node.js')
const labelNodes = require('./label-nodes.js')
const collectCodeAreas = require('./code-areas.js')
const {
  setStackTop,
  defaultExclude
} = require('../shared.js')

const readFile = promisify(fs.readFile)

// TODO Remove this function when the UI side of dependency code areas
// is implemented.
function removeDependencyAreasFromCodeAreas (codeAreas) {
  const depArea = codeAreas.find((area) => area.id === 'deps')
  delete depArea.children
  delete depArea.childrenVisibilityToggle
}

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

  const steps = [
    (tree) => labelNodes(tree),
    (tree) => tree.walk((node) => {
      node.categorise(systemInfo, appName)
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

  const codeAreas = collectCodeAreas({ merged, unmerged })

  // TODO Remove this TEMPORARY call when UI side of code area collection
  // is implemented
  removeDependencyAreasFromCodeAreas(codeAreas)

  return {
    appName,
    pathSeparator,
    codeAreas,
    merged,
    unmerged
  }
}

module.exports = analyse
