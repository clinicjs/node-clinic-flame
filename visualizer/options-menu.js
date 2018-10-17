'use strict'

const HtmlContent = require('./html-content.js')
const d3 = require('d3')

class OptionsMenu extends HtmlContent {
  constructor (parentContent, contentProperties) {
    super(parentContent, contentProperties)

    this.setCodeAreas({
      appName: 'app'
    })

    this.addCollapseControl(true, {
      classNames: 'options-menu-toggle',
      htmlElementType: 'button',
      htmlContent: 'Options <span class="chevron">›</span>'
    })
  }

  initializeElements () {
    super.initializeElements()

    this.d3OptionsList = this.d3ContentWrapper.append('div')
      .classed('options', true)

    // Visibility options.
    this.d3VisibilityOptions = this.d3OptionsList.append('div')
      .classed('section', true)
    this.d3VisibilityOptions.append('h2')
      .text('Visibility by code area')

    this.d3VisibilityOptions.append('ul')

    this.drawCodeAreaList()

    // Merging and highlighting options
    this.d3FgOptions = this.d3OptionsList.append('div')
      .classed('section', true)
    this.d3FgOptions.append('h2')
      .text('Merging and highlighting')
    this.d3FgOptions.append('ul')

    this.addFgOptionCheckbox({
      id: 'option-usemergedtree',
      name: 'Merge',
      description: 'joins optimized and unoptimized versions of frames',
      onChange: (checked) => {
        const flame = this.ui.uiContainer.content.get('flame-main')
        flame.contentProperties.useMergedTree = checked
        flame.draw()
        this.draw()
      }
    })

    this.addFgOptionCheckbox({
      id: 'option-showoptimizationstatus',
      name: 'Show optimization status',
      description: 'highlight frames based on whether they are optimized functions',
      onChange: (checked) => {
        const flame = this.ui.uiContainer.content.get('flame-main')
        flame.contentProperties.showOptimizationStatus = checked
        flame.draw()
        this.draw()
      }
    })

    this.ui.on('setData', () => {
      this.setData()
    })

    // Close when the user clicks outside the options menu.
    document.body.addEventListener('click', (event) => {
      if (!this.collapseClose.isCollapsed &&
          !this.d3Element.node().contains(event.target)) {
        this.collapseClose()
      }
    })
  }

  addFgOptionCheckbox ({ id, name, description, onChange }) {
    const li = this.d3FgOptions.select('ul').append('li')
      .attr('id', id)
    const label = li.append('label')
    label.append('input')
      .attr('type', 'checkbox')
      .on('click', () => {
        const { checked } = d3.event.target
        onChange(checked)
      })
    label.append('strong')
      .classed('name', true)
      .text(name)
    label.append('span')
      .classed('description', true)
      .text(` - ${description}`)
  }

  drawCodeAreaList () {
    const { ui } = this

    // Create the top-level filter options, like "app" / "deps" / "node.js"
    const d3RootItems = this.d3VisibilityOptions.select('ul')
      .selectAll('li').data(this.codeAreas)
    d3RootItems.exit().remove()
    const d3NewRootItems = d3RootItems.enter().append('li')
      .call(createOptionElement)
    d3NewRootItems.merge(d3RootItems)
      .call(renderOptionElement)

    // Create or update the required number of sub-<ul>s: 1 if there are any children;
    // 0 if there are none.
    const d3SubLists = d3NewRootItems.merge(d3RootItems)
      .selectAll('ul').data(d => d.children ? [d.children] : [])
    d3SubLists.exit().remove()
    const d3NewSubLists = d3SubLists.enter().append('ul')

    // Populate sub-<ul>s with child filter options.
    const d3SubListItems = d3NewSubLists.merge(d3SubLists)
      .selectAll('li').data(d => d)
    d3SubListItems.exit().remove()
    d3SubListItems.enter().append('li')
      .call(createOptionElement)
      // Update the labels for both new and existing items.
      .merge(d3SubListItems)
      .call(renderOptionElement)

    // Insert a new filter option element,
    // for use with a d3.enter() selection.
    function createOptionElement (li) {
      const label = li.append('label')
      label.append('input')
        .attr('type', 'checkbox')
        .on('change', onchange)
      label.append('span')
        .classed('name', true)
      label.append('description')
        .classed('description', true)
        .text(d => d.description ? ` - ${d.description}` : '')
    }

    // Update an existing filter option element,
    // for use with a d3.enter() + update selection.
    function renderOptionElement (li) {
      li.attr('data-area', data => data.id)
      li.select('.name')
        .text(data => data.title)
    }

    // Toggle a code area visibility setting.
    function onchange (data) {
      const { checked } = d3.event.target

      if (data.children) {
        data.children.forEach((child) => {
          ui.setCodeAreaVisibility(child.id, checked)
        })
      } else {
        ui.setCodeAreaVisibility(data.id, checked)
      }
      ui.draw()
    }

    this.codeAreasChanged = false
  }

  setData () {
    const {
      appName = 'app'
    } = this.ui.dataTree

    this.setCodeAreas({ appName })
  }

  setCodeAreas ({ appName }) {
    this.codeAreas = [
      { id: 'app', title: appName },
      { id: 'deps', title: 'dependencies' },
      { id: 'all-core',
        title: 'core',
        description: 'operations from node.js',
        children: [
          { id: 'core', title: 'node.js', description: 'operations from node\'s builtin javascript modules' },
          { id: 'native', title: 'native modules' },
          { id: 'v8', title: 'v8', description: 'v8 engine functions' },
          { id: 'cpp', title: 'c++', description: 'underlying c++ native code' },
          { id: 'regexp', title: 'regex', description: 'regular expressions' },
          { id: 'init', title: 'init', description: 'initialization operations, like loading modules' }
        ] }
    ]

    this.codeAreasChanged = true
  }

  applyCodeVisibilityExclusions (excludes) {
    this.d3VisibilityOptions
      .selectAll('li input')
      .property('checked', (area) => {
        if (area.children) {
          return area.children.some((child) => !excludes.has(child.id))
        }
        return !excludes.has(area.id)
      })
      .property('indeterminate', (area) => {
        const { children } = area
        if (!children) {
          return false
        }

        const first = excludes.has(children[0].id)
        return children.some((child) => excludes.has(child.id) !== first)
      })
  }

  draw () {
    super.draw()

    const flame = this.ui.uiContainer.content.get('flame-main')
    const { useMergedTree } = flame.contentProperties
    this.d3FgOptions.select('#option-showoptimizationstatus')
      .classed('disabled', useMergedTree)
      .select('input')
      .attr('disabled', useMergedTree ? 'disabled' : null)

    if (this.codeAreasChanged) {
      this.drawCodeAreaList()
    }

    this.applyCodeVisibilityExclusions(this.ui.exclude)
  }
}

module.exports = OptionsMenu
