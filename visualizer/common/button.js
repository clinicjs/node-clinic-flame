module.exports = ({ label, classNames = [], leftIcon = '', rightIcon = '', disabled = false, onClick, title } = {}) => {
  const button = document.createElement('button')
  button.classList.add('button', ...classNames)

  if (disabled) button.attr('disabled', true)
  if (title) button.setAttribute('title', title)

  if (onClick) {
    button.addEventListener('click', onClick)
  }
  button.innerHTML = `
    ${leftIcon}
    ${label ? `<span class="label">${label}</span>` : ``}
    ${rightIcon}
    `
  return button
}
