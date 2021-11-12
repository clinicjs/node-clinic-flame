'use strict'

const fs = require('fs')
const path = require('path')
const Module = require('module')
const toolVersion = require('../package').version

function systemInfo (zeroXDataPath) {
  const metaJson = JSON.parse(fs.readFileSync(path.join(zeroXDataPath, 'meta.json'), 'utf8'))
  // This assumes that 0x's meta.json argv array first item is the path to the profiled package
  // There may be future exceptions to this, e.g. test cases wrapped in NYC
  // See @clinic/bubbleprof's system-info.js for some examples
  const entryFile = path.resolve(metaJson.argv[0])

  let mainDirectory
  // entryFile may not exist if the user did eg. `node -e "evalcode"`.
  // In that case default to the working directory. It's hacky, but will do
  // for now. Perhaps ideally, this would run inside the child process so it has
  // more knowledge of which file is actually being run (like in bubbleprof)
  try {
    mainDirectory = path.dirname(Module._resolveFilename(entryFile, null, true))
  } catch (err) {
    mainDirectory = process.cwd()
  }

  return {
    mainDirectory,
    pathSeparator: path.sep,

    nodeVersions: process.versions,
    toolVersion
  }
}
module.exports = systemInfo
