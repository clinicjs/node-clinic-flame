const { toHtml } = require('./common/helpers.js')
const button = require('./common/button.js')
const overlay = require('./common/context-overlay.js')

const chevronRight = require('@nearform/clinic-common/icons/chevron-right')
const chevronLeft = require('@nearform/clinic-common/icons/chevron-left')
const close = require('@nearform/clinic-common/icons/close')

class WalkthroughPlayer {
  constructor ({ steps = [], backdrop = false, showControls = true }) {
    this.steps = steps
    this.backdrop = backdrop
    this.currentStepIndex = -1

    if (backdrop) {
      this.backdrop = document.createElement('div')
      this.backdrop.classList.add('walkthrough-backdrop')
    }

    this.wrapper = document.createElement('div')
    this.wrapper.classList.add('walkthrough-wrapper')

    this.content = document.createElement('div')
    this.content.classList.add('walkthrough-content')

    this.wrapper.appendChild(this.content)

    if (showControls) {
      this.wrapper.appendChild(button({
        classNames: ['closeBtn'],
        leftIcon: close,
        onClick: () => this.end()
      }))
      this.controls = document.createElement('div')
      this.controls.classList.add('walkthrough-controls')

      this.prevBtn = button({
        leftIcon: chevronLeft,
        onClick: e => this.prev()
      })
      this.controls.appendChild(this.prevBtn)

      this.stepsWrapper = document.createElement('div')
      this.stepsWrapper.classList.add('walkthrough-controls-steps')

      this.steps.forEach(s => {
        this.stepsWrapper.appendChild(toHtml(`<span class="step"/>`))
      })
      this.controls.appendChild(this.stepsWrapper)

      this.controls.appendChild(button({
        classNames: ['nextBtn'],
        rightIcon: chevronRight,
        label: 'Next',
        onClick: e => this.next()
      }))

      this.controls.appendChild(button({
        classNames: ['doneBtn'],
        label: 'Done!',
        onClick: e => this.end()
      }))

      this.wrapper.appendChild(this.controls)
    }
  }

  start () {
    this.currentStepIndex = 0
    return this._render()
  }

  next () {
    this.currentStepIndex++
    return this._render()
  }

  prev () {
    this.currentStepIndex--
    return this._render()
  }

  skipTo (index) {
    this.currentStepIndex = index
    return this._render()
  }

  end () {
    overlay.hide()
    return this.currentStepIndex
  }

  _render () {
    this.currentStepIndex = Math.min(this.currentStepIndex, this.steps.length - 1)
    this.currentStepIndex = Math.max(this.currentStepIndex, 0)

    if (this.currentStepIndex < 0) this.currentStepIndex = 0

    this.wrapper.classList.toggle('done', this.currentStepIndex === this.steps.length - 1)
    this.prevBtn.disabled = this.currentStepIndex === 0

    if (this.showControls) {
      this.prev.setAttribute('disabled', this.currentStepIndex <= 0 ? true : null)
    }

    const step = this.steps[this.currentStepIndex]
    this.content.innerHTML = ''
    this.content.appendChild(toHtml(step.msg))

    overlay.show({
      msg: this.wrapper,
      classNames: ['wt-container'],
      offset: { y: 3 },
      targetElement: document.querySelector(step.attachTo)
    })

    Array.from(this.stepsWrapper.children).forEach((c, i) => {
      c.classList.toggle('current', i === this.currentStepIndex)
    })

    return this.currentStepIndex
  }
}

module.exports = WalkthroughPlayer
