const debounce = require('lodash.debounce')

const wrapper = document.createElement('div')
wrapper.classList.add('element-highlighter')

wrapper.innerHTML = `
  <div class="element-highlighter-panel element-highlighter-top"></div>
  <div class="element-highlighter-panel element-highlighter-right"></div>
  <div class="element-highlighter-panel element-highlighter-bottom"></div>
  <div class="element-highlighter-panel element-highlighter-left"></div>
  <div class="element-highlighter-border"></div>
`
const backdropTop = wrapper.querySelector('.element-highlighter-top')
const backdropRight = wrapper.querySelector('.element-highlighter-right')
const backdropBottom = wrapper.querySelector('.element-highlighter-bottom')
const backdropLeft = wrapper.querySelector('.element-highlighter-left')
const backdropBorder = wrapper.querySelector('.element-highlighter-border')

document.body.appendChild(wrapper)

const elementHighLighter = {
  wrapper: wrapper,
  options: null,

  show: options => {
    wrapper.classList.add('show')
    elementHighLighter.options = options
    elementHighLighter._render()
  },

  hide: () => {
    wrapper.style.cssText = `opacity:0`
    wrapper.classList.remove('show')
  },

  _render: () => {
    if (!elementHighLighter.options) return
    const { element, padding = 5, showBorder = true } = elementHighLighter.options

    wrapper.classList.toggle('showBorder', showBorder)
    const pos = element.getBoundingClientRect()

    wrapper.style.cssText = `opacity:0.6`
    backdropTop.style.cssText = `transform:translate3d(${pos.left - padding}px, calc(-100vh + ${pos.top - padding}px), 0)`
    backdropRight.style.cssText = `transform:translate3d(${pos.left + pos.width + padding}px, ${pos.top - padding}px, 0)`
    backdropBottom.style.cssText = `transform:translate3d(calc(-100vw + ${pos.left + pos.width + padding}px), ${pos.top + pos.height + padding}px, 0)`
    backdropLeft.style.cssText = `transform:translate3d(calc(-100vw + ${pos.left - padding}px), calc(-100vh + ${pos.top + pos.height + padding}px), 0)`

    if (showBorder) {
      backdropBorder.style.cssText = `left:${pos.left - padding}px;top:${pos.top - padding}px;width:${pos.width + padding * 2}px;height:${pos.height + padding * 2}px;`
    }
  }
}

window.addEventListener('resize', debounce(elementHighLighter._render, 200))
window.addEventListener('scroll', debounce(elementHighLighter._render, 200))

module.exports = elementHighLighter
