module.exports = ({ label, classNames = [], leftIcon = '', rightIcon = '', disabled = false, onClick, title } = {}) => {
  const button = document.createElement('button')
  button.classList.add('c_button', ...classNames)

  button.disabled = disabled
  if (title) button.title = title

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
