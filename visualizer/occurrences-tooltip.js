'use strict'

module.exports = {
  getHtml ({ occurrences, isVisible, totalValue, getHeatColor }) {
    const defaultMessage = `<div class='tooltip-default-message'>Show/hide all the occurrences for the highlighted frame</div>`

    if (occurrences.length === 0) {
      return isVisible
        ? `<div class='tooltip-default-message'>No other occurrences found for this frame</div>`
        : defaultMessage
    }

    return !isVisible
      ? defaultMessage
      : `<div class='occurrences-tooltip'>${
        occurrences
          .sort((a, b) => b.onStackTop.asViewed - a.onStackTop.asViewed)
          .map(o => {
            return `<button class='frame' data-id='${o.id}'>
            <span class='heatColor' style='background-color:${getHeatColor(o)}'></span>
            ${o.onStackTop.asViewed}
            <span class='perc'>
              ${Math.round(100 * (o.onStackTop.asViewed / totalValue) * 10) / 10}%
            </span>
          </button>`
          }).join('')
      }</div>`
  }
}
