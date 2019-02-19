const caretRight = require('@nearform/clinic-common/icons/caret-right')
const caretLeft = require('@nearform/clinic-common/icons/caret-left')
const button = require('./button.js')
const { toHtml } = require('./helpers.js')

let currentlyExpandedDropDown = null

// Close when the user clicks outside the dropdown content.
document.body.addEventListener('click', (event) => {
  if (currentlyExpandedDropDown) {
    event.target.closest('.dropdown-content-wrapper') !== currentlyExpandedDropDown && currentlyExpandedDropDown.closest('.dropdown').close()
  }
})

module.exports = ({ label, classNames = [], disabled = false, expandAbove = false, content } = {}) => {
  const wrapper = document.createElement('div')
  wrapper.classList.add('dropdown', ...classNames)
  wrapper.classList.toggle('direction-up', expandAbove)

  const labelWrapper = document.createElement('div')
  labelWrapper.classList.add('label-wrapper')
  const labelHtml = toHtml(label, 'label')
  labelWrapper.appendChild(labelHtml)
  wrapper.appendChild(labelWrapper)

  wrapper.appendChild(button({
    disabled,
    leftIcon: expandAbove ? caretRight : caretLeft,
    onClick: e => {
      e.stopPropagation()

      if (wrapper.classList.contains('expanded')) {
        wrapper.close()
      } else {
        wrapper.open()
      }
    }
  }))

  wrapper.addEventListener('animationend', () => {
    wrapper.classList.toggle('contracted', false)
  })

  const contentWrapper = document.createElement('div')
  contentWrapper.classList.add('dropdown-content-wrapper')

  wrapper.close = () => {
    wrapper.classList.toggle('expanded', false)
    wrapper.classList.toggle('contracted', true)
    currentlyExpandedDropDown = null
  }
  wrapper.open = () => {
    contentWrapper.innerHTML = ''
    if (content) {
      contentWrapper.appendChild(toHtml(content), 'content')
    }
    wrapper.classList.toggle('contracted', false)
    wrapper.classList.toggle('expanded', true)
    currentlyExpandedDropDown = contentWrapper
  }

  wrapper.appendChild(contentWrapper)

  return wrapper
}
