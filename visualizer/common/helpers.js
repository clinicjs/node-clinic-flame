const helpers = {
  toHtml: (content, defaultClass) => {
    switch (typeof content) {
      case 'string':
        var node = document.createElement('span')
        node.className = defaultClass || ''
        node.textContent = content
        return node

      case 'function':
        return helpers.toHtml(content())

      case 'object':
        if (content.nodeType === 1) {
        // it is an HTMLElement
          if (content.classList.length === 0) {
            content.className = defaultClass || ''
          }
          return content
        }
    }

    throw new TypeError('The provided content is not a String, a function or an HTMLElement ')
  }
}

module.exports = helpers
