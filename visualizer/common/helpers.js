const helpers = {
  toHtml: (content, defaultClass) => {
    switch (typeof content) {
      case 'string':
        if (content.trim().indexOf('<') === 0) {
          const parser = new window.DOMParser()
          return parser.parseFromString(content, 'text/html').body.firstElementChild
          // returns a HTMLDocument, which also is a Document.
        } else {
          var node = document.createElement('span')
          node.className = defaultClass || ''
          node.textContent = content
          return node
        }

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
