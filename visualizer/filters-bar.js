'use strict'

const HtmlContent = require('./html-content.js')
const sidePanelExpand = require('@nearform/clinic-common/icons/sidepanel-expand')
const sidePanelCollapse = require('@nearform/clinic-common/icons/sidepanel-collapse')
const listView = require('@nearform/clinic-common/icons/list-view')

const button = require('./common/button.js')
const checkButtonCombo = require('./common/check-button-combo.js')
const checkbox = require('./common/checkbox.js')

class FiltersContainer extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    // creating the tooltip instance that the Ui's components can share
    const tooltip = this.addContent('Tooltip', {
      htmlElementType: 'div',
      id: 'filters-tooltip'
    })
    this.tooltip = tooltip

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
    this.d3Center.d3Element.append(() =>
      button({
        label: 'V8',
        rightIcon: listView
      }))
      .on('click', this.toggleSideBar)

    // Dependencies combo ****
    const d3DepCombo = this.d3Center.d3Element.append(() => checkButtonCombo({
      label: 'Dependecies',
      indeterminate: true
    }))

    d3DepCombo.select('input')
      .on('change', () => {
        console.log('change!')
      })
    d3DepCombo.select('button')
      .on('click', (datum, index, nodes) => {
        this.tooltip.toggle({
          msg: getDependenciesChildren,
          targetRect: nodes[index].getBoundingClientRect(),
          verticalAlign: 'top',
          showDelay: 0,
          hideDelay: 0
        })
        // this.toggleSideBar()
        // nodes[index].closest('button').classList.toggle('show', this.showSideBar)
      })

    // V8 combo ****
    const d3V8Combo = this.d3Center.d3Element.append(() => checkButtonCombo({
      label: 'V8',
      indeterminate: true
    }))

    d3V8Combo.select('input')
      .on('change', () => {
        console.log('change!')
      })
    d3V8Combo.select('button')
      .on('click', (datum, index, nodes) => {
        this.tooltip.toggle({
          msg: this.getV8Children.bind(this),
          offset: { x: -20, y: -2 },
          targetRect: nodes[index].getBoundingClientRect(),
          verticalAlign: 'top',
          showDelay: 0,
          callback: () => {
            console.log('hide!')
            
            nodes[index].closest('button').classList.toggle('show', !this.ui.tooltip.isHidden)
          }
        })

        nodes[index].closest('button').classList.toggle('show', this.ui.tooltip.isHidden)
      })

    this.d3Right.d3Element
      .append(button)
      .on('click', this.toggleSideBar)
  }

  getV8Children () {
    const list = this.ui.dataTree.codeAreas
      .find(
        data => data.excludeKey === 'all-v8'
      ).children
      .map(c => checkbox({ rightLabel: c.label }))

    const wrapper = document.createElement('div')
    wrapper.classList.add('tooltip-checkbox')
    list.forEach(l => wrapper.appendChild(l))

    return wrapper
  }

  draw () {
    super.draw()
    this.d3Right.d3Element.select('button')
      .html(`<span class='label'>Options</span> ${this.showSideBar ? sidePanelCollapse : sidePanelExpand}`)
  }
}

function getDependenciesChildren () {
  return this.ui.dataTree.codeAreas.filter(data => data.excludeKey === 'deps').children
}

module.exports = FiltersContainer
