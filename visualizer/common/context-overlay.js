const { toHtml } = require('./helpers.js')
const debounce = require('lodash.debounce')

const overlayEl = document.createElement('div')
overlayEl.classList.add('c_context-overlay')

const overlayInnerEl = document.createElement('div')
overlayInnerEl.classList.add('c_context-overlay-inner')

overlayEl.appendChild(overlayInnerEl)

document.body.appendChild(overlayEl)

const overlay = {
  el: overlayEl,
  options: null,
  show: (options) => {
    overlay.options = options
    overlayEl.classList.add('show', ...options.classNames || [])
    overlay._render()
  },
  hide: () => {
    overlayInnerEl.innerHTML = ''
    overlayEl.style.cssText = ''
    overlayInnerEl.style.cssText = ''
    overlayEl.classList.remove('show')
  },
  _render: () => {
    if (!overlayEl.classList.contains('show')) return

    let {
      msg,
      targetElement,
      targetRect,
      outerRect = document.body.getBoundingClientRect(),
      offset,
      pointerCoords,
      verticalAlign = 'bottom'
    } = overlay.options

    let {
      left: x,
      top: y,
      width,
      height
    } = targetRect || targetElement.getBoundingClientRect()

    if (y + height > window.innerHeight / 2) {
      verticalAlign = 'top'
    }

    let msgHtmlNode = toHtml(msg)

    if (offset) {
      x += offset.x || 0
      y += offset.y || 0
      width += offset.width || 0
      height += offset.height || 0
    }
    console.log(targetElement.getBoundingClientRect(), width)

    let ttLeft = x + width / 2
    // if the element is in the lower half of the screen than align the overlay to the top side
    let ttTop = y + (verticalAlign === 'bottom' ? height : -(2 * offset.y))

    if (pointerCoords) {
      // centering on the mouse pointer horizontally
      ttLeft = x + pointerCoords.x
    }
    const oldWidth = overlayInnerEl.style.width
    overlayInnerEl.style.width = 'auto'

    overlayInnerEl.innerHTML = ''
    overlayInnerEl.appendChild(msgHtmlNode)

    overlayEl.style.cssText = `left:${ttLeft}px; top:${ttTop}px;`
    // calculating the actual overlay width
    const ttWidth = msgHtmlNode.offsetWidth
    const ttHeight = msgHtmlNode.offsetHeight

    overlayInnerEl.style.width = oldWidth

    const justToForceARedraw = overlayInnerEl.offsetWidth

    // positioning the overlay content
    // making sure that it doesn't go over the element right edge
    const alignRight = ttLeft + ttWidth - (x + width)
    let deltaX = Math.max(alignRight, ttWidth / 2)

    // then checking it doesn't overflow the element left edge
    deltaX = (ttLeft - deltaX < x) ? ttLeft - x : deltaX

    // then checking the outer element right edge
    if (outerRect) {
      deltaX = (ttLeft - deltaX + ttWidth > outerRect.right) ? alignRight : deltaX
    }

    const maxWidth = outerRect ? outerRect.width + 'px' : 'auto'
    const top = verticalAlign === 'top' ? -ttHeight : 0
    overlayInnerEl.style.cssText = `left:-${deltaX}px; max-width:${maxWidth}; top:${top}px; height:${ttHeight}px; width:${ttWidth}px`
  }
}

window.addEventListener('resize', debounce(overlay._render, 200))
window.addEventListener('scroll', debounce(overlay._render, 200))

module.exports = overlay
