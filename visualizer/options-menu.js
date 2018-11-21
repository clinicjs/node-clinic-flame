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

    this.setCodeAreas([
      { id: 'app' }
    ])

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
      .text('Advanced')
    this.d3FgOptions.append('ul')

    this.d3InitCheckbox = this.addFgOptionCheckbox({
      id: 'option-init',
      name: 'Init',
      description: 'Show initialization operations hidden by default, like module loading',
      onChange: (checked) => {
        ui.setCodeAreaVisibility('init', checked)
        ui.draw()
      }
    })

    this.d3MergeCheckbox = this.addFgOptionCheckbox({
      id: 'option-usemergedtree',
      name: 'Merge',
      description: 'Join optimized and unoptimized versions of frames',
      onChange: (checked) => {
        this.ui.setUseMergedTree(checked)
      }
    })

    this.d3OptCheckbox = this.addFgOptionCheckbox({
      id: 'option-showoptimizationstatus',
      name: 'Show optimization status',
      description: 'Highlight frames that are optimized functions',
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
    prefLi.enter().append('li').call((li) => {
      const datum = li.datum()
      this.addFgOptionCheckbox({
        id: datum.id,
        name: datum.title,
        onChange: (checked) => {
          datum.onChange(this.ui, checked)
        }
      }, prefUl)
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

  addFgOptionCheckbox ({ id, name, description, onChange }, d3ParentNode) {
    d3ParentNode = d3ParentNode || this.d3FgOptions.select('ul')
    const d3Li = d3ParentNode.append('li')
      .attr('id', id)
    const d3Wrapper = d3Li.append('div')
      .classed('overflow-wrapper', true)
    const d3Label = d3Wrapper.append('label')
    const d3Checkbox = d3Label.append('input')
      .attr('type', 'checkbox')
      .on('click', () => {
        const { checked } = d3.event.target
        onChange(checked)
      })

    d3Label.append('span')
      .classed('icon-wrapper', true)
      .html(`
        <img class="icon-img checked" data-inline-svg src="/visualizer/assets/icons/checkbox-checked.svg" />
        <img class="icon-img unchecked" data-inline-svg src="/visualizer/assets/icons/checkbox-unchecked.svg" />
        <img class="icon-img indetermined" data-inline-svg src="/visualizer/assets/icons/checkbox-indetermined.svg" />
      `)

    const d3CopyWrapper = d3Label.append('span')
      .classed('copy-wrapper', true)
    d3CopyWrapper.append('span')
      .classed('name', true)
      .text(name)
    if (description) {
      d3CopyWrapper.append('span')
        .classed('description', true)
        .html(` - ${description}`)
    }

    return d3Checkbox
  }

  drawCodeAreaList () {
    const { ui } = this
    const self = this

    // Create the top-level filter options, like "app" / "deps" / "core"
    const d3RootItems = this.d3VisibilityOptions.select('ul')
      .selectAll('li').data(this.codeAreas)
    d3RootItems.exit().remove()

    const d3NewRootItems = d3RootItems.enter().append('li')
      .call(createOptionElement)
    d3NewRootItems.merge(d3RootItems)
      .classed('childrenVisibilityToggle', d => d.childrenVisibilityToggle === true)
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
      const wrapper = li.append('div')
        .classed('overflow-wrapper', true)
      const label = wrapper.append('label')
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
        .html((d) => {
          const description = ui.getDescriptionFromKey(d.id)
          return description ? ` - ${description}` : ''
        })
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
      codeAreas,
      useMerged,
      showOptimizationStatus
    } = this.ui.dataTree

    this.d3MergeCheckbox.property('checked', useMerged)
    this.d3OptCheckbox.property('checked', showOptimizationStatus)

    this.setCodeAreas(codeAreas)
  }

  setCodeAreas (codeAreas) {
    this.codeAreas = codeAreas
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
        if (!Array.isArray(children) || children.length === 0) {
          return false
        }

        const first = excludes.has(children[0].id)
        return children.some((child) => excludes.has(child.id) !== first)
      })
  }

  draw () {
    super.draw()

    // Update option checkbox values.
    const { useMerged, showOptimizationStatus, exclude, appName } = this.ui.dataTree
    this.d3MergeCheckbox.property('checked', useMerged)
    this.d3OptCheckbox
      .attr('disabled', useMerged ? 'disabled' : null)
      .property('checked', showOptimizationStatus)
      .select(function () { return this.closest('li') })
      .classed('disabled', useMerged)
    this.d3InitCheckbox.property('checked', !exclude.has('init'))

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
