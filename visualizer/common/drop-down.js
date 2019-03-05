const caretRight = require('@nearform/clinic-common/icons/caret-right')
const caretLeft = require('@nearform/clinic-common/icons/caret-left')
const button = require('./button.js')
const { toHtml } = require('./helpers.js')

let currentlyExpandedDropDown = null

// Closes when the user clicks outside the dropdown content.
document.body.addEventListener('click', (event) => {
  if (event.target.closest('.dropdown-content-wrapper') !== currentlyExpandedDropDown) closeCurrentlyExpandedDropDown()
})

function closeCurrentlyExpandedDropDown () {
  currentlyExpandedDropDown && currentlyExpandedDropDown.closest('.dropdown').close()
}

module.exports = ({ label, classNames = [], disabled = false, expandAbove = false, content } = {}) => {
  let ddContent = content
  const wrapper = document.createElement('div')
  wrapper.classList.add('dropdown', ...classNames)
  wrapper.classList.toggle('direction-up', expandAbove)

  const labelWrapper = document.createElement('div')
  labelWrapper.classList.add('label-wrapper')

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

  wrapper.update = ({ label, content }) => {
    console.log('drop-down update');
    
    if (label) {
      const labelHtml = toHtml(label, 'label')
      labelWrapper.innerHTML = ''
      labelWrapper.appendChild(labelHtml)
    }

    if (content) {
      ddContent = content
      updateContent()
    }
  }

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
    closeCurrentlyExpandedDropDown()
    updateContent()
    wrapper.classList.toggle('contracted', false)
    wrapper.classList.toggle('expanded', true)
    currentlyExpandedDropDown = contentWrapper
  }

  function updateContent () {
    contentWrapper.innerHTML = ''
    if (ddContent) {
      contentWrapper.appendChild(toHtml(ddContent))
    }
  }

  wrapper.appendChild(contentWrapper)
  wrapper.update({ label })
  return wrapper
}
