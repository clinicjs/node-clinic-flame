'use strict'

const HtmlContent = require('./html-content.js')
const { checkbox, accordion, helpers } = require('@nearform/clinic-common/base')

// const close = require('@nearform/clinic-common/icons/close')

class FiltersContent extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)

    this.sections = null
    this.currentAccordion = null
    this.expandedSubAccordions = {}

    this.maxVisibleSubItemsCount = 4

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

      // *  *  *  * Code Areas *  *  *  *
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
              this._onVisibilityChange(datum, event.target.checked)
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
            this._onVisibilityChange(datum, event.target.checked)
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

    // this.d3ContentWrapper.append(() => button({
    //   leftIcon: close,
    //   classNames: ['side-bar-close-btn'],
    //   onClick: () => {
    //     this.ui.toggleSideBar(false)
    //   }
    // }))

    // creating the main sections
    // *  *  *  * Code Areas *  *  *  *
    this.d3CodeArea = this.d3ContentWrapper.append('div')
      .classed('code-area section', true)

    const visibilityAcc = accordion({
      label: 'Visibility by code area',
      isExpanded: true,
      content: `<ul class="options"></ul>`,
      classNames: ['visibility-acc'],
      onClick: () => {
        this._exclusiveAccordion(visibilityAcc)
      }
    })
    this.d3CodeArea.append(() => visibilityAcc)
    this.currentAccordion = visibilityAcc

    // *  *  *  * Advanced *  *  *  *
    this.d3Advanced = this.d3ContentWrapper.append('div')
      .classed('advanced section', true)

    const advancedAcc = accordion({
      label: 'Advanced',
      content: `<ul class="options"></ul>`,
      classNames: ['advanced-acc'],
      onClick: () => {
        this._exclusiveAccordion(advancedAcc)
      }
    })
    this.d3Advanced.append(() => advancedAcc)

    // *  *  *  * Preferences *  *  *  *
    this.d3Preferences = this.d3ContentWrapper.append('div')
      .classed('preferences section', true)

    const preferencesAcc = accordion({
      label: 'Preferences',
      content: `<ul class="options"></ul>`,
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

  _onVisibilityChange (datum, checked) {
    this.ui.setCodeAreaVisibility(datum, checked)
    this.ui.draw()
  }

  _createListItems (items) {
    const fragment = document.createDocumentFragment()

    items.forEach(item => {
      const li = helpers.toHtml('<li></li>')
      fragment.appendChild(li)
      li.appendChild(this._createOptionElement(item))

      if (item.children && item.children.length > 0) {
        const visibleUl = helpers.toHtml(`<ul></ul>`)
        const visibleChildren = item.children.slice(0, this.maxVisibleSubItemsCount)

        visibleUl.appendChild(this._createListItems(visibleChildren))
        li.appendChild(visibleUl)

        if (item.children.length > this.maxVisibleSubItemsCount) {
          const collapsedChildren = item.children.slice(this.maxVisibleSubItemsCount)
          const collapsedUl = helpers.toHtml(`<ul></ul>`)

          collapsedUl.appendChild(this._createListItems(collapsedChildren))

          const acc = accordion({
            isExpanded: this.expandedSubAccordions[item.excludeKey] === true,
            classNames: [`${item.excludeKey}-show-all-acc`, `nc-accordion--secondary`],
            label: `Show more (${collapsedChildren.length})`,
            content: collapsedUl,
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
    const div = helpers.toHtml(`<div class="${data.excludeKey ? data.excludeKey.split(':')[0] : ''}"></div>`)

    div.appendChild(checkbox({
      checked: data.checked,
      rightLabel: `
          <span class="name">${data.label}</span>
          <description class="description">${data.description ? `- ${data.description}` : ``}</description>        
          `,
      onChange: (event) => { data.onChange && data.onChange(data, event) }
    }))

    return div
  }

  draw () {
    super.draw()

    if (this.sections) {
      // *  *  *  * Code Areas *  *  *  *
      const codeAreas = this.sections.codeAreas.map(d => {
        return Object.assign({}, d, { children: d.children && d.children.length ? d.children : undefined })
      })
      let ul = this.d3CodeArea.select('ul').node()
      ul.innerHTML = ''
      ul.appendChild(this._createListItems(codeAreas))

      // *  *  *  * Advanced *  *  *  *
      ul = this.d3Advanced.select('ul').node()
      ul.innerHTML = ''
      ul.appendChild(this._createListItems(this.sections.advanced))

      // *  *  *  * Preferences *  *  *  *
      ul = this.d3Preferences.select('ul').node()
      ul.innerHTML = ''
      ul.appendChild(this._createListItems(this.sections.preferences))
    }
  }
}

module.exports = FiltersContent
