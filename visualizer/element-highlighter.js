
const wrapper = document.createElement('div')
wrapper.classList.add('element-highlighter')

wrapper.innerHTML = `
  <div class="element-highlighter-top"></div>
  <div class="element-highlighter-right"></div>
  <div class="element-highlighter-bottom"></div>
  <div class="element-highlighter-left"></div>
`
const backdropTop = wrapper.querySelector('.element-highlighter-top')
const backdropRight = wrapper.querySelector('.element-highlighter-right')
const backdropBottom = wrapper.querySelector('.element-highlighter-bottom')
const backdropLeft = wrapper.querySelector('.element-highlighter-left')

document.body.appendChild(wrapper)

const elementHighLighter = {
  wrapper: wrapper,

  show: ({ element, padding = 5 }) => {
    wrapper.classList.add('show')
    const pos = element.getBoundingClientRect()

    wrapper.style.cssText = `opacity:0.6`
    backdropTop.style.cssText = `transform:translate3d(${pos.left - padding}px, calc(-100vh + ${pos.top - padding}px), 0)`
    backdropRight.style.cssText = `transform:translate3d(${pos.left + pos.width + padding}px, ${pos.top - padding}px, 0)`
    backdropBottom.style.cssText = `transform:translate3d(calc(-100vw + ${pos.left + pos.width + padding}px), ${pos.top + pos.height + padding}px, 0)`
    backdropLeft.style.cssText = `transform:translate3d(calc(-100vw + ${pos.left - padding}px), calc(-100vh + ${pos.top + pos.height + padding}px), 0)`
  },

  hide: () => {
    wrapper.style.cssText = `opacity:0`
    wrapper.classList.remove('show')
  }
}

module.exports = elementHighLighter
