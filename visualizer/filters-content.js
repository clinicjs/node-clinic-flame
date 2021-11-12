'use strict'

const HtmlContent = require('./html-content.js')
const { checkbox, accordion, helpers } = require('@clinic/clinic-common/base')

class FiltersContent extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.sections = null
    this.currentAccordion = null
    this.expandedSubAccordions = {}

    this.getSpinner = contentProperties.getSpinner

    this.ui.on('presentationMode', mode => {
      this.presentationMode = mode
      this.update()
      this.draw()
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
    // Preferences
    this.sections = {
      preferences: [
        {
          id: 'presentation_mode',
          label: 'Presentation mode',
          checked: this.ui.presentationMode === true,
          value: false,
          onChange: (datum, event) => {
            this.ui.setPresentationMode(event.target.checked)
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

      // Code Areas
      this.sections.codeAreas = codeAreas.map(area => {
        const dataCount = this.getDataCountFromKey(area.excludeKey)

        let disabled = data.disabled === true

        if (area.excludeKey === 'deps') {
          // checking Dependencies only
          disabled = dataCount === 0 || data.disabled === true
        }

        if (area.children) {
          area.children = area.children.map(c => {
            const child = Object.assign({}, c)
            child.label = this.ui.getLabelFromKey(child.excludeKey)
            child.description = this.ui.getDescriptionFromKey(child.excludeKey)
            child.checked = (() => {
              if (child.children) {
                return child.children.some((ch) => !exclude.has(ch.excludeKey))
              }
              return !exclude.has(child.excludeKey)
            })()
            child.onChange = (datum, event) => {
              this._onVisibilityChange(datum, event.target)
            }

            return child
          })
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
          onChange: (datum, event) => {
            this._onVisibilityChange(datum, event.target)
          }
        })
      })

      // Advanced
      this.sections.advanced = [
        {
          id: 'option-init',
          label: 'Init',
          description: 'Show initialization operations hidden by default, like module loading',
          checked: !exclude.has('is:init'),
          onChange: (datum, event) => {
            this.ui.setCodeAreaVisibility({ excludeKey: 'is:init' }, event.target.checked)
            this.ui.draw()
          }
        },
        {
          id: 'option-usemergedtree',
          label: 'Merge',
          description: 'Join optimized and unoptimized versions of frames',
          checked: useMerged,
          onChange: (datum, event) => {
            this.ui.setUseMergedTree(event.target.checked)
            // Toggle "Show optimization status" disabled class if Merged enabled/disabled
            const showOptStatusId = this.sections.advanced[this.sections.advanced.length - 1].id
            const el = this.d3Advanced.select('#' + showOptStatusId)
            el.classed('disabled', event.target.checked)
          }
        },
        {
          id: 'option-showoptimizationstatus',
          label: 'Show optimization status',
          description: 'Highlight frames that are optimized functions',
          disabled: useMerged,
          checked: showOptimizationStatus,
          onChange: (datum, event) => {
            this.ui.setShowOptimizationStatus(event.target.checked)
          }
        }

      ]

      this.exclude = exclude
    }
  }

  initializeElements () {
    super.initializeElements()
    this.d3ContentWrapper
      .classed('filters-content', true)
      .classed('scroll-container', true)

    // creating the main sections
    // Code Areas
    this.d3CodeArea = this.d3ContentWrapper.append('div')
      .classed('code-area section', true)

    const visibilityAcc = accordion({
      label: 'Visibility by code area',
      isExpanded: true,
      content: '<ul class="options"></ul>',
      classNames: ['visibility-acc'],
      onClick: () => {
        this._exclusiveAccordion(visibilityAcc)
      }
    })
    this.d3CodeArea.append(() => visibilityAcc)
    this.currentAccordion = visibilityAcc

    // Advanced
    this.d3Advanced = this.d3ContentWrapper.append('div')
      .classed('advanced section', true)

    const advancedAcc = accordion({
      label: 'Advanced',
      content: '<ul class="options"></ul>',
      classNames: ['advanced-acc'],
      onClick: () => {
        this._exclusiveAccordion(advancedAcc)
      }
    })
    this.d3Advanced.append(() => advancedAcc)

    // Preferences
    this.d3Preferences = this.d3ContentWrapper.append('div')
      .classed('preferences section', true)

    const preferencesAcc = accordion({
      label: 'Preferences',
      content: '<ul class="options"></ul>',
      classNames: ['preferences-acc'],
      onClick: () => {
        this._exclusiveAccordion(preferencesAcc)
      }
    })
    this.d3Preferences.append(() => preferencesAcc)
  }

  getDataCountFromKey (key) {
    return this.ui.dataTree ? this.ui.dataTree.activeNodes().filter(n => n.category === key).length : 0
  }

  _exclusiveAccordion (clickedAccordion) {
    // auto collapses the previously expanded accordion
    (this.currentAccordion !== clickedAccordion) && this.currentAccordion.toggle(false)
    this.currentAccordion = clickedAccordion
  }

  _onVisibilityChange (datum, targetElement, updatingChildren) {
    const checked = targetElement.checked
    const parent = targetElement.parentElement

    parent.classList.add('pulsing')

    // Need to give the browser the time to apply the class
    setTimeout(
      () => {
        this.ui.setCodeAreaVisibility({
          codeArea: datum,
          visible: checked
        })
        this.ui.draw()
        parent.classList.remove('pulsing')
      }, 15)
  }

  _createListItems (items) {
    const fragment = document.createDocumentFragment()

    items.forEach(item => {
      const li = helpers.toHtml('<li></li>')
      fragment.appendChild(li)
      li.appendChild(this._createOptionElement(item))

      if (item.children && item.children.length > 0) {
        const childrenUl = helpers.toHtml('<ul></ul>')
        childrenUl.appendChild(this._createListItems(item.children))
        li.appendChild(childrenUl)

        if (item.childrenVisibilityToggle) {
          const acc = accordion({
            isExpanded: this.expandedSubAccordions[item.excludeKey] === true,
            classNames: [`${item.excludeKey}-show-all-acc`, 'nc-accordion--secondary'],
            label: `Show more (${item.children.length})`,
            content: childrenUl,
            onClick: (expanded) => {
              this.expandedSubAccordions[item.excludeKey] = expanded
            }
          })

          li.appendChild(acc)
        }
      }
    })

    return fragment
  }

  _createOptionElement (data) {
    const div = helpers.toHtml(`<div id="${data.id ? data.id : ''}" class="${data.excludeKey ? data.excludeKey.split(':')[0] : ''}"></div>`)

    div.appendChild(checkbox({
      checked: data.checked,
      disabled: data.disabled,
      indeterminate: data.indeterminate,
      rightLabel: `
        <span class="name">${data.label}</span>
        <description class="description">${data.description ? `- ${data.description}` : ''}</description>
      `,
      onChange: (event) => {
        data.onChange && data.onChange(data, event)
      }
    }))

    return div
  }

  draw () {
    super.draw()

    if (this.sections) {
      // Code Areas
      const codeAreas = this.sections.codeAreas.map(d => {
        return Object.assign({}, d, { children: d.children && d.children.length ? d.children : undefined })
      })
      let ul = this.d3CodeArea.select('ul').node()
      ul.innerHTML = ''
      ul.appendChild(this._createListItems(codeAreas))

      // Advanced
      ul = this.d3Advanced.select('ul').node()
      ul.innerHTML = ''
      ul.appendChild(this._createListItems(this.sections.advanced))

      // "Show optimization status" disabled class by default
      const showOptStatusId = this.sections.advanced[this.sections.advanced.length - 1].id
      const el = this.d3Advanced.select('#' + showOptStatusId)
      el.classed('disabled', true)

      // Preferences
      ul = this.d3Preferences.select('ul').node()
      ul.innerHTML = ''
      ul.appendChild(this._createListItems(this.sections.preferences))
    }
  }
}

module.exports = FiltersContent
