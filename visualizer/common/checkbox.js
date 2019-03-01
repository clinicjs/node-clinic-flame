const checkboxCheckedIcon = require('@nearform/clinic-common/icons/checkbox-checked')
const checkboxUncheckedIcon = require('@nearform/clinic-common/icons/checkbox-unchecked')
const checkboxIndeterminedIcon = require('@nearform/clinic-common/icons/checkbox-indetermined')

module.exports = ({ leftLabel, rightLabel, classNames = [], checked = false, disabled = false, indeterminate = false, onChange } = {}) => {
  const wrappingLabel = document.createElement('label')
  wrappingLabel.classList.add('c_checkbox', ...classNames)

  wrappingLabel.innerHTML = `
        <input type="checkbox" 
          ${disabled ? 'disabled' : ''}
          ${checked ? 'checked' : ''}
        >
        ${leftLabel ? `
        <span class="copy-wrapper">
          <span class="checkbox-copy-label">${leftLabel}</span>
        </span>` : ``}
        
        <span class="icon-wrapper">
          ${checkboxCheckedIcon}
          ${checkboxUncheckedIcon}
          ${checkboxIndeterminedIcon}
        </span>
        ${rightLabel ? `
        <span class="copy-wrapper">
          <span class="checkbox-copy-label">${rightLabel}</span>
        </span>` : ``}
    `
  const input = wrappingLabel.querySelector('input')
  input.indeterminate = indeterminate

  if (onChange) {
    input.addEventListener('change', onChange)
  }
  return wrappingLabel
}
