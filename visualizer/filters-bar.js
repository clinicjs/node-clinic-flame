'use strict'
const HtmlContent = require('./html-content.js')
const sidePanelExpand = require('@clinic/clinic-common/icons/sidepanel-expand')
const sidePanelCollapse = require('@clinic/clinic-common/icons/sidepanel-collapse')
const search = require('@clinic/clinic-common/icons/search')

const { button, checkbox, dropdown } = require('@clinic/clinic-common/base')

class FiltersContainer extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.getSpinner = contentProperties.getSpinner

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
      classNames: 'inline-panel after-bp-2'
    })

    this.showSideBar = false

    this.ui.on('sideBar', show => {
      this.showSideBar = show
      this.draw()
    })

    this.ui.on('setData', () => {
      this.draw()
    })
    this.toggleSideBar = contentProperties.toggleSideBar.bind(this.ui)
  }

  initializeElements () {
    super.initializeElements()

    // App checkbox
    this.d3AppCheckBox = this.d3Center.d3Element.append('div')
      .classed('filter-option', true)
      .classed('key-app', true)
      .append('div')
      .classed('label-wrapper', true)
      .append(() =>
        checkbox({
          leftLabel: 'app',
          onChange: e => this.setCodeAreaVisibility('app', e.target)
        })
      )

    // Dependencies combo ****
    this.depsDropDown = dropdown({
      classNames: ['filter-option', 'key-deps'],
      label: checkbox({
        leftLabel: `<span class='after-bp-1'>Dependencies</span>
          <span class='before-bp-1'>Deps</span>`,
        onChange: e => this.setCodeAreaVisibility('deps', e.target)
      }),
      content: getChildrenHtml.bind(this, 'deps'),
      expandAbove: true
    })
    this.d3DepsCombo = this.d3Center.d3Element.append(() => this.depsDropDown)

    // TODO maybe disable if there are no wasm frames?
    this.d3WasmCheckBox = this.d3Center.d3Element.append('div')
      .classed('filter-option', true)
      .classed('key-wasm', true)
      .append('div')
      .classed('label-wrapper', true)
      .append(() =>
        checkbox({
          leftLabel: `<span class='after-bp-1'>WebAssembly</span>
            <span class='before-bp-1'>WASM</span>`,
          onChange: e => this.setCodeAreaVisibility('wasm', e.target)
        })
      )

    // NodeJS checkbox ****
    this.d3NodeCheckBox = this.d3Center.d3Element.append('div')
      .classed('filter-option', true)
      .classed('key-core', true)
      .append('div')
      .classed('label-wrapper', true)
      .append(() =>
        checkbox({
          leftLabel: `<span class='after-bp-1'>Node JS</span>
            <span class='before-bp-1'>Node</span>`,
          onChange: e => this.setCodeAreaVisibility('core', e.target)
        })
      )

    // V8 combo ****
    this.d3V8Combo = this.d3Center.d3Element.append(() => dropdown({
      classNames: ['filter-option', 'key-v8'],
      label: checkbox({
        leftLabel: 'V8',
        onChange: e => {
          this.setCodeAreaVisibility('all-v8', e.target)
        }
      }),
      content: getChildrenHtml.bind(this, 'all-v8'),
      expandAbove: true
    }))

    this.d3Right.d3Element
      .append(() => button({
        leftIcon: search,
        classNames: ['before-bp-2'],
        onClick: () => this.ui.toggleMobileSearchBox()
      }))

    this.optionsBp1 = button({
      classNames: ['sidebar-toggler', 'before-bp-1'],
      rightIcon: sidePanelExpand,
      onClick: () => this.toggleSideBar()
    })

    this.d3Right.d3Element
      .append(() => this.optionsBp1)

    this.optionsBp2 = button({
      classNames: ['sidebar-toggler', 'after-bp-1'],
      label: 'Options',
      rightIcon: sidePanelExpand,
      onClick: () => this.toggleSideBar()
    })
    this.d3Right.d3Element
      .append(() => this.optionsBp2)
  }

  setCodeAreaVisibility (key, checkboxElement) {
    const parent = checkboxElement.parentElement
    const checked = checkboxElement.checked
    parent.classList.add('pulsing')

    // Need to give the browser the time to actually execute spinner.show
    setTimeout(
      () => {
        const area = this.ui.dataTree.codeAreas
          .find(
            data => data.excludeKey === key
          )
        if (area) {
          this.ui.setCodeAreaVisibility({
            codeArea: area,
            visible: checked
          })
          this.ui.updateExclusions()
          this.ui.draw()
        } else {
          console.error('Could not find code area for', key, 'in', this.ui)
        }
        parent.classList.remove('pulsing')
      }
      , 15)
  }

  draw () {
    super.draw()

    this.optionsBp1.update({
      rightIcon: this.showSideBar ? sidePanelCollapse : sidePanelExpand
    })
    this.optionsBp2.update({
      rightIcon: this.showSideBar ? sidePanelCollapse : sidePanelExpand
    })

    // app
    this.d3AppCheckBox.select('input').node()
      .checked = !this.ui.dataTree.exclude.has('app')
    this.d3AppCheckBox.select('.checkbox-copy-label')
      .html(`
        <span class='after-bp-2'>
          ${this.ui.dataTree.appName}
        </span>
        <span class='before-bp-2'>App</span>
      `)

    this.d3WasmCheckBox.select('input').node()
      .checked = !this.ui.dataTree.exclude.has('wasm')

    // node js
    this.d3NodeCheckBox.select('input').node()
      .checked = !this.ui.dataTree.exclude.has('core')

    // deps
    const d3DepsInput = this.d3DepsCombo.select('input').node()
    const deps = this.ui.dataTree.codeAreas.find(
      data => data.excludeKey === 'deps'
    )
    this.depsDropDown.update({
      content: getChildrenHtml.bind(this, 'deps')
    })
    d3DepsInput.indeterminate = (() => {
      const { children } = deps
      if (!Array.isArray(children) || children.length === 0) {
        return false
      }
      const first = this.ui.dataTree.exclude.has(children[0].excludeKey)

      return children.some((child) => this.ui.dataTree.exclude.has(child.excludeKey) !== first)
    })()
    d3DepsInput.checked = (() => {
      if (deps.children && deps.children.length) {
        return deps.children.some((child) => {
          return !this.ui.dataTree.exclude.has(child.excludeKey)
        })
      }
      return !this.ui.dataTree.exclude.has(deps.excludeKey)
    })()

    // V8
    const d3V8Input = this.d3V8Combo.select('input').node()
    const V8 = this.ui.dataTree.codeAreas.find(
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

function getChildrenHtml (key) {
  const area = this.ui.dataTree.codeAreas
    .find(
      data => data.excludeKey === key
    )

  if (!area.children) return ''
  const list = area.children
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
    const parent = target.parentElement
    parent.classList.add('pulsing')

    const codeArea = area.children.find(d => d.excludeKey === target.dataset.excludeKey)

    setTimeout(() => {
      this.ui.setCodeAreaVisibility({
        codeArea,
        visible: target.checked
      })

      this.ui.updateExclusions()
      this.ui.draw()
      parent.classList.remove('pulsing')
    }, 15)
  })

  return wrapper
}

module.exports = FiltersContainer
