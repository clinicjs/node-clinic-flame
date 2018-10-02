'use strict'

const path = require('path')

function getLoggingPaths (options = {}) {
  // TODO: make path configurable, like https://github.com/nearform/node-clinic-doctor/pull/165

  let dirpath, basename
  if (options.hasOwnProperty('identifier')) {
    dirpath = ''
    basename = options.identifier.toString()
  } else if (options.hasOwnProperty('path')) {
    dirpath = path.dirname(options.path)
    basename = path.basename(options.path, '.clinic-flame')
  } else {
    dirpath = ''
    basename = '{pid}' // pid is defined inside 0x process, then 0x will replace this string
  }

  const dirname = `${basename}.clinic-flame`
  const systemInfoFilename = `${basename}.clinic-flame-systeminfo`
  const inlinedFunctionsFilename = `${basename}.clinic-flame-inlinedfunctions`
  const samplesFilename = `${basename}.clinic-flame-samples`

  // TODO: Deprecate this and write smaller .clinic-flame-{dataType} files, similar to other tools
  const zeroXDir = `${basename}.clinic-flame-0x-data`

  return {
    '/': path.join(dirpath, dirname),
    '/systeminfo': path.join(dirpath, dirname, systemInfoFilename),
    '/inlinedfunctions': path.join(dirpath, dirname, inlinedFunctionsFilename),
    '/samples': path.join(dirpath, dirname, samplesFilename),
    '/0x-data/': path.join(dirpath, dirname, zeroXDir)
  }
}

module.exports = getLoggingPaths
