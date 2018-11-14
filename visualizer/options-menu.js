'use strict'

const HtmlContent = require('./html-content.js')
const d3 = require('./d3.js')

const preferences = [
  {
    id: 'presentation_mode',
    title: 'Presentation mode',
    value: false,
    onChange: (ui, checked) => {
      ui.setPresentationMode(checked)
    }
  }
]

class OptionsMenu extends HtmlContent {
  constructor (parentContent, contentProperties) {
    super(parentContent, contentProperties)

    this.setCodeAreas({
      appName: 'app'
    })

    this.addCollapseControl(true, {
      classNames: 'options-menu-toggle',
      htmlElementType: 'button',
      htmlContent: `<span class="label">Options</span> <img class="icon-img chevron" data-inline-svg src="/visualizer/assets/icons/caret-up.svg" />`
    })

    this.showMore = {}

    this.ui.on('presentationMode', mode => {
      const pref = preferences.find(pref => {
        return pref.id === 'presentation_mode'
      })
      pref.value = mode === true
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

    this.d3MergeCheckbox = this.addFgOptionCheckbox({
      id: 'option-usemergedtree',
      name: 'Merge',
      description: 'joins optimized and unoptimized versions of frames',
      onChange: (checked) => {
        this.ui.setUseMergedTree(checked)
      }
    })

    this.d3OptCheckbox = this.addFgOptionCheckbox({
      id: 'option-showoptimizationstatus',
      name: 'Show optimization status',
      description: 'highlight frames that are optimized functions',
      onChange: (checked) => {
        this.ui.setShowOptimizationStatus(checked)
      }
    })

    // preferences
    this.d3Preferences = this.d3OptionsList.append('div')
      .classed('section preferences', true)
    this.d3Preferences.append('h2')
      .text('Preferences')

    const prefUl = this.d3Preferences.append('ul')
    const prefLi = prefUl.selectAll('li').data(preferences)
    prefLi.exit().remove()
    prefLi.enter().append('li')
      .html(d => {
        return (`
          <label>
            <input id='${d.id}' type='checkbox' "${d.value ? 'checked' : ''}" /> 
            <span class='icon-wrapper'>
              <img class="icon-img checked" data-inline-svg src="/visualizer/assets/icons/checkbox-checked.svg" />
              <img class="icon-img unchecked" data-inline-svg src="/visualizer/assets/icons/checkbox-unchecked.svg" />
            </span>
            <span class='copy-wrapper'>${d.title}</span>
          </label>
        `)
      })

    prefUl.selectAll('input')
      .on('change', () => {
        const chkbox = d3.event.target
        d3.select(chkbox.closest('li')).datum().onChange(this.ui, chkbox.checked)
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
    },
    true) // using useCapture here so that we can handle the event before `.showMore` button updates its content
  }

  addFgOptionCheckbox ({ id, name, description, onChange }) {
    const li = this.d3FgOptions.select('ul').append('li')
      .attr('id', id)
    const label = li.append('label')
    const d3Checkbox = label.append('input')
      .attr('type', 'checkbox')
      .on('click', () => {
        const { checked } = d3.event.target
        onChange(checked)
      })

    label.append('span')
      .classed('icon-wrapper', true)
      .html(`
      <img class="icon-img checked" data-inline-svg src="/visualizer/assets/icons/checkbox-checked.svg" />
      <img class="icon-img unchecked" data-inline-svg src="/visualizer/assets/icons/checkbox-unchecked.svg" />
      <img class="icon-img indetermined" data-inline-svg src="/visualizer/assets/icons/checkbox-indetermined.svg" />
      `)

    const copyWrapper = label.append('span')
      .classed('copy-wrapper', true)
    copyWrapper.append('span')
      .classed('name', true)
      .text(name)
    copyWrapper.append('span')
      .classed('description', true)
      .html(` - ${description}`)

    return d3Checkbox
  }

  drawCodeAreaList () {
    const { ui } = this
    const self = this

    // Create the top-level filter options, like "app" / "deps" / "node.js"
    const d3RootItems = this.d3VisibilityOptions.select('ul')
      .selectAll('li').data(this.codeAreas)
      .classed('childrenVisibilityToggle', d => d.childrenVisibilityToggle === true)
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

    // I am sure there's a better way to do this...
    const caretIcon = `<img class="icon-img" data-inline-svg src="/visualizer/assets/icons/caret-down.svg" />`
    this.d3VisibilityOptions.selectAll('.childrenVisibilityToggle')
      .append('button')
      .html(`<span>show more</span> ${caretIcon}`)
      .classed('children-toggle-btn', true)
      .on('click', function (d) {
        const showMore = !(self.showMore[d.id] === true)

        self.showMore[d.id] = showMore

        const parent = d3.select(this.closest('.childrenVisibilityToggle'))
        parent.classed('show-more', showMore)

        d3.select(this).html(`<span>show ${showMore ? 'less' : 'more'}</span> ${caretIcon}`)
      })

    // Insert a new filter option element,
    // for use with a d3.enter() selection.
    function createOptionElement (li) {
      li.classed('visible', d => d.visible === true)
      const label = li.append('label')
        .attr('title', d => d.title)
      label.append('input')
        .attr('type', 'checkbox')
        .on('change', onchange)
      label.append('span')
        .classed('icon-wrapper', true)
        .html(`
          <img class="icon-img checked" data-inline-svg src="/visualizer/assets/icons/checkbox-checked.svg" />
          <img class="icon-img unchecked" data-inline-svg src="/visualizer/assets/icons/checkbox-unchecked.svg" />
          <img class="icon-img indetermined" data-inline-svg src="/visualizer/assets/icons/checkbox-indetermined.svg" />
        `)
      const copyWrapper = label.append('span')
        .classed('copy-wrapper', true)
      copyWrapper.append('span')
        .classed('name', true)
      copyWrapper.append('description')
        .classed('description', true)
        .html(d => d.description ? ` - ${d.description}` : '')
    }

    // Update an existing filter option element,
    // for use with a d3.enter() + update selection.
    function renderOptionElement (li) {
      li.attr('data-area', data => data.id)
      li.select('.name')
        .text(data => ui.getLabelFromKey(data.id))
    }

    // Toggle a code area visibility setting.
    function onchange (data) {
      const { checked } = d3.event.target

      if (data.children) {
        let anyChanges = false
        data.children.forEach((child) => {
          // Pass flag to only call ui.updateExclusions() when all changes are made
          const isChanged = ui.setCodeAreaVisibility(child.id, checked, true)
          if (isChanged) anyChanges = true
        })
        if (anyChanges) ui.updateExclusions()
      } else {
        ui.setCodeAreaVisibility(data.id, checked)
      }
      ui.draw()
    }

    this.codeAreasChanged = false
  }

  setData () {
    const {
      appName = 'app',
      useMerged,
      showOptimizationStatus
    } = this.ui.dataTree

    this.d3MergeCheckbox.property('checked', useMerged)
    this.d3OptCheckbox.property('checked', showOptimizationStatus)

    this.setCodeAreas({ appName })
  }

  setCodeAreas ({ appName }) {
    this.codeAreas = [
      { id: 'app', title: appName },
      { id: 'deps', title: 'dependencies' },
      { id: 'all-core',
        title: 'core',
        description: 'The Node.js framework and its dependencies',
        childrenVisibilityToggle: true,
        children: [
          { id: 'core', visible: true, description: `JS functions in core Node.js APIs. <a target="_blank" class="more-info href="https://clinicjs.org/flame/walkthrough/controls/#core">More info</a>` },
          { id: 'native', visible: true, description: `JS compiled into V8, such as prototype methods and eval. <a target="_blank" class="more-info href="https://clinicjs.org/flame/walkthrough/controls/#native">More info</a>` },
          { id: 'v8', description: `Operations in V8's implementation of JS. <a target="_blank" class="more-info href="https://clinicjs.org/flame/walkthrough/controls/#v8">More info</a>` },
          { id: 'cpp', description: `Native C++ operations called by V8, including shared libraries. <a target="_blank" class="more-info href="https://clinicjs.org/flame/walkthrough/controls/#cpp">More info</a>` },
          { id: 'regexp', description: `The RegExp notation is shown as the function name. <a target="_blank" class="more-info href="https://clinicjs.org/flame/walkthrough/controls/#rx">More info</a>` },
          { id: 'init', description: `Any of the above that are repeated frequently during initialization. <a target="_blank" class="more-info href="https://clinicjs.org/flame/walkthrough/controls/#init">More info</a>` }
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

    // Update option checkbox values.
    const { useMerged, showOptimizationStatus, appName } = this.ui.dataTree
    this.d3FgOptions.select('#option-usemergedtree')
      .select('input')
      .property('checked', useMerged)
    this.d3FgOptions.select('#option-showoptimizationstatus')
      .classed('disabled', useMerged)
      .select('input')
      .attr('disabled', useMerged ? 'disabled' : null)
      .property('checked', showOptimizationStatus)

    // Updating the app name
    this.d3VisibilityOptions.select('.name')
      .text(appName)
    if (this.codeAreasChanged) {
      this.drawCodeAreaList()
    }

    this.applyCodeVisibilityExclusions(this.ui.dataTree.exclude)

    this.d3Preferences.select('#presentation_mode')
      .property('checked', this.ui.presentationMode)
  }
}

module.exports = OptionsMenu
