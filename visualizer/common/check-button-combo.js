const caretUp = require('@nearform/clinic-common/icons/caret-up')
const button = require('./button.js')
const checkbox = require('./checkbox.js')

module.exports = ({ label, classes = [], buttonIcon = caretUp, disabled = false, indeterminate = false } = {}) => {
  const wrapper = document.createElement('div')
  wrapper.classList.add('combo-wrapper', ...classes)

  wrapper.appendChild(checkbox({
    leftLabel: label,
    indeterminate
  }))
  wrapper.appendChild(button({
    disabled,
    leftIcon: buttonIcon
  }))

  return wrapper
}
