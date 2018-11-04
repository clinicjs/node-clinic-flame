function labelNodes (tree) {
  let id = 0
  tree.walk((node) => {
    node.id = id++
  })
  return tree
}

module.exports = labelNodes
