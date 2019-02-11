const caretUp = require('@nearform/clinic-common/icons/caret-up')
const button = require('./button.js')
const checkbox = require('./checkbox.js')

module.exports = ({ label, classes = [], buttonIcon = caretUp, disabled = false, indeterminate = false } = {}) => {
  const wrapper = document.createElement('div')
  wrapper.classList.add('combo-wrapper', ...classes)
  const comboButton = button({
    disabled,
    leftIcon: buttonIcon
  })
  const comboCheckBox = checkbox({
    leftLabel: label,
    indeterminate
  })

  wrapper.appendChild(comboCheckBox)
  wrapper.appendChild(comboButton)

  return wrapper
}
