'use strict'

const HtmlContent = require('./html-content.js')
const checkbox = require('@nearform/clinic-common/base/checkbox.js')
const button = require('@nearform/clinic-common/base/button.js')
const close = require('@nearform/clinic-common/icons/close')

class FiltersContent extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.sections = null

    this.ui.on('presentationMode', mode => {
      if (this.presentationMode !== mode) {
        this.presentationMode = mode
        this.draw()
      }
    })

    this.ui.on('updateExclusions', () => {
      this.update()
      this.draw()
    })

    this.ui.on('setData', () => {
      this.update()
      this.draw()
    })
  }

  update () {
    // *  *  *  * Preferences *  *  *  *
    this.sections = {
      preferences: [
        {
          id: 'presentation_mode',
          label: 'Presentation mode',
          value: false,
          onChange: (datum, i, nodes) => {
            this.ui.setPresentationMode(nodes[i].checked)
          }
        }
      ]
    }

    const data = this.ui.dataTree

    if (data) {
      const {
        codeAreas,
        useMerged,
        showOptimizationStatus,
        exclude
      } = data

      // *  *  *  * Code Areas *  *  *  *
      this.sections.codeAreas = codeAreas.map(area => {
        const dataCount = this.getDataCountFromKey(area.excludeKey)

        let disabled = data.disabled === true

        if (area.excludeKey === 'deps') {
          // checking Dependencies only
          disabled = dataCount === 0 || data.disabled === true
        }

        const checked = (() => {
          if (area.children && area.children.length) {
            return area.children.some((child) => !exclude.has(child.excludeKey))
          }
          return !exclude.has(area.excludeKey)
        })()

        const indeterminate = (() => {
          const { children } = area
          if (!Array.isArray(children) || children.length === 0) {
            return false
          }

          const first = exclude.has(children[0].excludeKey)
          return children.some((child) => exclude.has(child.excludeKey) !== first)
        })()

        return Object.assign({}, area, {
          label: this.ui.getLabelFromKey(area.excludeKey),
          description: this.ui.getDescriptionFromKey(area.excludeKey),
          disabled,
          checked,
          indeterminate,
          onChange: (datum, i, nodes) => {
            onVisibilityChange(datum, i, nodes, this.ui)
          }
        })
      })

      // *  *  *  * Advanced *  *  *  *
      this.sections.advanced = [
        {
          id: 'option-init',
          label: 'Init',
          description: 'Show initialization operations hidden by default, like module loading',
          checked: !exclude.has('is:init'),
          onChange: (datum, i, nodes) => {
            this.ui.setCodeAreaVisibility({ excludeKey: 'is:init' }, nodes[i].checked)
            this.ui.draw()
          }
        },
        {
          id: 'option-usemergedtree',
          label: 'Merge',
          description: 'Join optimized and unoptimized versions of frames',
          checked: useMerged,
          onChange: (datum, i, nodes) => {
            this.ui.setUseMergedTree(nodes[i].checked)
          }
        },
        {
          id: 'option-showoptimizationstatus',
          label: 'Show optimization status',
          description: 'Highlight frames that are optimized functions',
          disabled: useMerged,
          checked: showOptimizationStatus,
          onChange: (datum, i, nodes) => {
            this.ui.setShowOptimizationStatus(nodes[i].checked)
          }
        }

      ]

      this.exclude = exclude
    }
  }

  initializeElements () {
    super.initializeElements()
    this.d3ContentWrapper
      .classed('filters-options', true)
      .classed('scroll-container', true)

    this.d3ContentWrapper.append(() => button({
      leftIcon: close,
      classNames: ['side-bar-close-btn'],
      onClick: () => {
        this.ui.toggleSideBar(false)
      }
    }))

    // creating the main sections
    // *  *  *  * Code Areas *  *  *  *
    this.d3CodeArea = this.d3ContentWrapper.append('div')
      .classed('code-area section', true)
    this.d3CodeArea.append('h2').text('Visibility by code area')
    this.d3CodeArea.append('ul').classed('options', true)

    // *  *  *  * Advanced *  *  *  *
    this.d3Advanced = this.d3ContentWrapper.append('div')
      .classed('advanced section', true)
    this.d3Advanced.append('h2').text('Advanced')
    this.d3Advanced.append('ul').classed('options', true)

    // *  *  *  * Preferences *  *  *  *
    this.d3Preferences = this.d3ContentWrapper.append('div')
      .classed('preferences section', true)
    this.d3Preferences.append('h2').text('Preferences')
    this.d3Preferences.append('ul').classed('options', true)
  }

  getDataCountFromKey (key) {
    return this.ui.dataTree ? this.ui.dataTree.activeNodes().filter(n => n.category === key).length : 0
  }

  draw () {
    super.draw()

    if (this.sections) {
      // *  *  *  * Code Areas *  *  *  *
      const codeAreas = this.sections.codeAreas.map(d => {
        return Object.assign({}, d, { children: d.children && d.children.length ? d.children : undefined })
      })
      let d3NewLi = createListItems(this.d3CodeArea.select('ul'), codeAreas)

      // subfilters
      const d3SubUl = d3NewLi.selectAll('ul').data(d => d.children ? [d.children] : [])
      d3SubUl.exit().remove()

      const newUl = d3SubUl.enter().append('ul')

      let dataSelection = d3SubUl.merge(newUl).selectAll('li').data(data => data.map(d => {
        d.label = this.ui.getLabelFromKey(d.excludeKey)
        d.description = this.ui.getDescriptionFromKey(d.excludeKey)
        d.checked = (() => {
          if (d.children) {
            return d.children.some((child) => !this.exclude.has(child.excludeKey))
          }
          return !this.exclude.has(d.excludeKey)
        })()
        d.onChange = (datum, i, nodes) => {
          onVisibilityChange(datum, i, nodes, this.ui)
        }

        return d
      }))
      dataSelection.enter().append('li')
        .call(createOptionElement)
        .call(updateOptionElement)
      dataSelection.exit().remove()

      // *  *  *  * Advanced *  *  *  *
      createListItems(this.d3Advanced.select('ul'), this.sections.advanced)

      // *  *  *  * Preferences *  *  *  *
      createListItems(this.d3Preferences.select('ul'), this.sections.preferences)
    }
  }
}

module.exports = FiltersContent

function onVisibilityChange (datum, i, nodes, ui) {
  const checked = nodes[i].checked

  ui.setCodeAreaVisibility(datum, checked)
  ui.draw()
}

function createListItems (ul, data) {
  const dataSelection = ul.selectAll('li').data(data)
  dataSelection.exit().remove()
  const d3NewLi = dataSelection.enter().append('li').call(createOptionElement)
  return d3NewLi.merge(dataSelection).call(updateOptionElement)
}

function updateOptionElement (li) {
  li
    .classed('visible', d => d.visible === true)
    .classed('childrenVisibilityToggle', d => d.childrenVisibilityToggle === true)
    .classed('disabled', (data) => data.disabled === true)

    .select('input')
    .attr('disabled', d => d.disabled || null)
    .property('checked', d => d.checked)
    .property('indeterminate', (d) => d.indeterminate)
    .property('class', d => d.disabled ? 'disabled' : '')
}

function createOptionElement (li) {
  li.html(data => `
    <div class="${data.excludeKey ? data.excludeKey.split(':')[0] : ''}">
      ${checkbox({
    rightLabel: `
        <span class="name">${data.label}</span>
        <description class="description">
          ${data.description ? `- ${data.description}` : ``}
        </description>        
        `
  }).outerHTML}      
    </div>
  `)

  li.select('input')
    .on('change', (datum, i, nodes) => { datum.onChange && datum.onChange(datum, i, nodes) })
}
