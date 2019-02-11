module.exports = ({ label, classes = [], leftIcon = '', rightIcon = '', disabled = false } = {}) => {
  const button = document.createElement('button')
  button.classList.add('button', ...classes)
  if (disabled) button.attr('disabled', true)

  button.innerHTML = `
    ${leftIcon}
    ${label ? `<span class="label">${label}</span>` : ``}
    ${rightIcon}
    `
  return button
}
