'use strict'

const HtmlContent = require('./html-content.js')
const checkboxCheckedIcon = require('@nearform/clinic-common/icons/checkbox-checked')
const checkboxUncheckedIcon = require('@nearform/clinic-common/icons/checkbox-unchecked')
const checkboxIndeterminedIcon = require('@nearform/clinic-common/icons/checkbox-indetermined')

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
        return {
          ...area,
          count: this.getDataCountFromKey(area.excludeKey),
          label: this.ui.getLabelFromKey(area.excludeKey),
          description: this.ui.getDescriptionFromKey(area.excludeKey),
          checked: (() => {
            if (area.children && area.children.length) {
              return area.children.some((child) => !exclude.has(child.excludeKey))
            }
            return !exclude.has(area.excludeKey)
          })(),
          indeterminate: (() => {
            const { children } = area
            if (!Array.isArray(children) || children.length === 0) {
              return false
            }

            const first = exclude.has(children[0].excludeKey)
            return children.some((child) => exclude.has(child.excludeKey) !== first)
          })(),
          onChange: (datum, i, nodes) => {
            onVisibilityChange(datum, i, nodes, this.ui)
          }
        }
      })

      // *  *  *  * Advanced *  *  *  *
      this.sections.advanced = {
        useMerged,
        showOptimizationStatus
      }

      this.exclude = exclude
    }
  }

  initializeElements () {
    super.initializeElements()

    // creating the main sections
    this.d3CodeArea = this.d3ContentWrapper.append('div')
      .classed('code-area section', true)
    this.d3CodeArea.append('h2').text('Visibility by code area')
    this.d3CodeArea.append('ul').classed('options', true)

    this.d3Advanced = this.d3ContentWrapper.append('div')
      .classed('advanced section', true)
    this.d3Advanced.append('h2').text('Advanced')
    this.d3Advanced.append('ul').classed('options', true)

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
      let dataSelection = this.d3CodeArea.select('ul').selectAll('li').data(this.sections.codeAreas)
      dataSelection.exit().remove()
      dataSelection.call(updateOptionElement)

      const d3Li = dataSelection.enter().append('li').call(createOptionElementSL)

      const d3SubUl = d3Li.merge(dataSelection).selectAll('ul').data(d => d.children ? [d.children] : [])
      d3SubUl.exit().remove()
      const newUl = d3SubUl.enter().append('ul')

      // subfilters
      dataSelection = d3SubUl.merge(newUl).selectAll('li').data(data => data.map(d => {
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
      dataSelection.enter().append('li').call(createOptionElementSL)
      dataSelection.exit().remove()

      // *  *  *  * Advanced *  *  *  *
      dataSelection = this.d3Advanced.select('ul').selectAll('li').data(this.sections.advanced)
      dataSelection.enter().append('li').call(createOptionElementSL)
      dataSelection.exit().remove()

      // *  *  *  * Preferences *  *  *  *
      dataSelection = this.d3Preferences.select('ul').selectAll('li').data(this.sections.preferences)
      dataSelection.enter().append('li').call(createOptionElementSL)
      dataSelection.exit().remove()
    }
  }
}

module.exports = FiltersContent

function onVisibilityChange (datum, i, nodes, ui) {
  const checked = nodes[i].checked

  if (datum.children && datum.children.length) {
    let anyChanges = false
    datum.children.forEach((child) => {
      // Pass flag to only call ui.updateExclusions() when all changes are made
      const isChanged = ui.setCodeAreaVisibility(child.excludeKey, checked, true)
      if (isChanged) anyChanges = true
    })
    if (anyChanges) ui.updateExclusions()
  } else {
    ui.setCodeAreaVisibility(datum.excludeKey, checked)
  }

  ui.draw()
}

function updateOptionElement (li) {
  li.select('input')
    .property('checked', d => d.checked)
    .property('indeterminate', (d) => d.indeterminate)
}

function createOptionElementSL (li) {
  li.classed('visible', d => d.visible === true)
  li.classed('childrenVisibilityToggle', d => d.childrenVisibilityToggle === true)
  li.classed('disabled', (d) => {
    // check Dependencies only
    if (d.excludeKey === 'deps') {
      return d.count === 0
    }
    return false
  })

  li.html(data => `
    <div class='${data.excludeKey && data.excludeKey.split(':')[0]}'>
      <label>
        <input type="checkbox" 
          ${data.checked ? 'checked' : ''}
          ${data.indeterminate ? 'indeterminate' : ''}
          ${(data.excludeKey !== 'deps') ? (data.count === 0 ? true : '') : ''}
        >
        <span class="icon-wrapper">
          ${checkboxCheckedIcon}
          ${checkboxUncheckedIcon}
          ${checkboxIndeterminedIcon}
        </span>
        <span class="copy-wrapper">
          <span class="name">${data.label}</span>
          <description class="description">
            ${data.description && `- ${data.description}`}
          </description>
        </span>
      </label>
    </div>
  `)

  li.select('input').on('change', (datum, i, nodes) => { datum.onChange && datum.onChange(datum, i, nodes) })
}
