const dropdown = require('./common/drop-down.js')

module.exports = () => {
  const wrapper = dropdown()

  wrapper.showNodeInfo = (node, dataTree) => {
    const totalValue = dataTree && dataTree.activeTree().value
    const stackPercentages = {
      top: Math.round(100 * (node.onStackTop.asViewed / totalValue) * 10) / 10,
      overall: Math.round(100 * (node.value / totalValue) * 10) / 10
    }

    wrapper.update({
      label: `${stackPercentages.top}%`,
      content: `
    <div>
      <h2>Stack info</h2>
      <p class="frame-percentage frame-percentage-top">Top of stack: ${stackPercentages.top}%</p>
      <p class="frame-percentage frame-percentage-overall">On stack: ${stackPercentages.overall}%</p>
    </div>`
    })
  }

  return wrapper
}
