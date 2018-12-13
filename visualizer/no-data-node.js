'use strict'

// Recreate the object every time it is needed so the caller
// can change properties without mutating the original.
function getNoDataNode () {
  return {
    category: 'none', // Used to distinguish fake nodes like this from real ones
    children: [],
    functionName: 'No data.',
    fileName: 'Nothing to show currently.',
    id: null, // Don't show any id in the url hash
    name: '',
    onStackTop: {
      asViewed: 0,
      base: 0,
      rootFromMean: 0
    },
    type: 'no-data', // Used for this node specifically, indicating no visible data

    areaText: 'No frames are visible', // Trailing '.' is added in info-box.js
    getNodeRect: function () {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
    }
  }
}

module.exports = getNoDataNode
