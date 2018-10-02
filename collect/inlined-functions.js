const fs = require('fs')
const path = require('path')

function inlinedFunctions (zeroXDataPath) {
  const metaJson = JSON.parse(fs.readFileSync(path.join(zeroXDataPath, 'meta.json'), 'utf8'))
  const { inlined } = metaJson

  return inlined
}

module.exports = inlinedFunctions
