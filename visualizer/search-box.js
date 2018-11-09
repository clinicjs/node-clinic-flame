const HtmlContent = require('./html-content.js')
const debounce = require('lodash.debounce')

class SearchBox extends HtmlContent {
  constructor (parentContent, contentProperties) {
    super(parentContent, contentProperties)

    this.ui.on('clearSearch', () => {
      this.d3Input.property('value', null)
    })

    this.ui.on('search', (query) => {
      this.d3Input.property('value', query)
    })
  }

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
