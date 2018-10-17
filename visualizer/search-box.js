const HtmlContent = require('./html-content.js')
const debounce = require('lodash.debounce')

class SearchBox extends HtmlContent {
  initializeElements () {
    super.initializeElements()

    this.d3Input = this.d3Element.append('input')
      .attr('placeholder', 'Search...')

    this.d3Input.on('input', debounce(() => {
      this.onInput()
    }, 300))
  }

  onInput () {
    const query = this.d3Input.property('value')
    if (query === '') {
      this.ui.clearSearch()
    } else {
      this.ui.search(query)
    }
  }
}

module.exports = SearchBox
