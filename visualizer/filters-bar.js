'use strict'

const HtmlContent = require('./html-content.js')
const sidePanelExpand = require('@nearform/clinic-common/icons/sidepanel-expand')
const sidePanelCollapse = require('@nearform/clinic-common/icons/sidepanel-collapse')

const button = require('./common/button.js')
const checkbox = require('./common/checkbox.js')
const dropdown = require('./common/drop-down.js')

class FiltersContainer extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    // layout wrappers
    this.d3Left = this.addContent('HtmlContent', {
      classNames: 'left-col col-wrapper'
    })

    this.d3Center = this.addContent('HtmlContent', {
      classNames: 'center-col col-wrapper'
    })

    this.d3Right = this.addContent('HtmlContent', {
      classNames: 'right-col col-wrapper'
    })

    // components
    this.d3Right.addContent('SearchBox', {
      id: 'search-box',
      classNames: 'inline-panel'
    })

    this.showSideBar = false

    this.toggleSideBar = () => {
      this.showSideBar = !this.showSideBar
      contentProperties.toggleSideBar(this.showSideBar)
      this.draw()
    }
  }

  initializeElements () {
    super.initializeElements()

    // call stacks
    this.d3CallStacksButton = this.d3Left.d3Element.append(() => dropdown({
      label: 'Call stacks by duration. More info',
      content: 'Some cool content here!',
      expandAbove: true
    }))

    // App checkbox
    this.d3AppCheckBox = this.d3Center.d3Element.append(() =>
      checkbox({
        leftLabel: 'app',
        onChange: e => this.setCodeAreaVisibility('app', e.target.checked)
      }))

    // Dependencies combo ****
    this.d3DepsCombo = this.d3Center.d3Element.append(() => dropdown({
      label: checkbox({
        leftLabel: 'Dependencies',
        onChange: e => this.setCodeAreaVisibility('deps', e.target.checked)
      }),
      content: 'No children... for now',
      expandAbove: true
    }))

    // NodeJS checkbox ****
    this.d3NodeCheckBox = this.d3Center.d3Element.append(() =>
      checkbox({
        leftLabel: 'Node JS',
        onChange: e => this.setCodeAreaVisibility('core', e.target.checked)
      }))

    // V8 combo ****
    this.d3V8Combo = this.d3Center.d3Element.append(() => dropdown({
      label: checkbox({
        leftLabel: 'V8',
        onChange: e => {
          this.setCodeAreaVisibility('all-v8', e.target.checked)
        }
      }),
      content: getV8Children.bind(this),
      expandAbove: true
    }))

    this.d3Right.d3Element
      .append(button)
      .on('click', this.toggleSideBar)
  }

  setCodeAreaVisibility (key, value) {
    const area = this.ui.dataTree.codeAreas
      .find(
        data => data.excludeKey === key
      )
    this.ui.setCodeAreaVisibility(area, value)
    this.ui.updateExclusions()
    this.ui.draw()
  }

  draw () {
    super.draw()

    this.d3Right.d3Element.select('button')
      .html(`<span class='label'>Options</span> ${this.showSideBar ? sidePanelCollapse : sidePanelExpand}`)

    // app
    this.d3AppCheckBox.select('input').node()
      .checked = !this.ui.dataTree.exclude.has('app')
    this.d3AppCheckBox.select('.copy-wrapper')
      .text(this.ui.dataTree.appName)

    // node js
    this.d3NodeCheckBox.select('input').node()
      .checked = !this.ui.dataTree.exclude.has('core')

    // deps
    this.d3DepsCombo.select('input').node()
      .checked = !this.ui.dataTree.exclude.has('deps')

    // V8
    const d3V8Input = this.d3V8Combo.select('input').node()
    const V8 = this.ui.dataTree.codeAreas
      .find(
        data => data.excludeKey === 'all-v8'
      )
    d3V8Input.indeterminate = (() => {
      const { children } = V8
      if (!Array.isArray(children) || children.length === 0) {
        return false
      }
      const first = this.ui.dataTree.exclude.has(children[0].excludeKey)

      return children.some((child) => this.ui.dataTree.exclude.has(child.excludeKey) !== first)
    })()
    d3V8Input.checked = (() => {
      if (V8.children && V8.children.length) {
        return V8.children.some((child) => {
          return !this.ui.dataTree.exclude.has(child.excludeKey)
        })
      }
      return !this.ui.dataTree.exclude.has(V8.excludeKey)
    })()
  }
}

function getV8Children () {
  const V8 = this.ui.dataTree.codeAreas
    .find(
      data => data.excludeKey === 'all-v8'
    )
  const list = V8.children
    .map(d => {
      const elem = checkbox({
        rightLabel: d.label,
        checked: !this.ui.dataTree.exclude.has(d.excludeKey)
      })
      elem.querySelector('input').dataset.excludeKey = d.excludeKey
      return elem
    })

  const wrapper = document.createElement('div')

  list.forEach(l => wrapper.appendChild(l))

  wrapper.addEventListener('change', e => {
    const target = e.target
    const codeArea = V8.children.find(d => d.excludeKey === target.dataset.excludeKey)

    this.ui.setCodeAreaVisibility(codeArea, target.checked)
    this.ui.updateExclusions()
    this.ui.draw()
  })

  return wrapper
}

module.exports = FiltersContainer
