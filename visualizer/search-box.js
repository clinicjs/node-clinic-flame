const HtmlContent = require('./html-content.js')
const debounce = require('lodash.debounce')

class SearchBox extends HtmlContent {
  constructor (parentContent, contentProperties) {
    const properties = Object.assign({}, contentProperties)
    properties.classNames = properties.classNames.split(' ')
    properties.classNames.push('search-box')
    properties.classNames = properties.classNames.join(' ')

    super(parentContent, properties)

    this.ui.on('clearSearch', () => {
      this.d3Input.property('value', '')
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
