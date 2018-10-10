'use strict'

// This lookup object of HTML content types is necessary to prevent circular dependencies
// e.g. if an A contains a B which contains an A
module.exports = {
  // Parent class, for generic HTML content with optional collapse, load indicator, etc
  HtmlContent: require('./html-content.js'),

  // Sub classes which extend HtmlContent
  AreaKey: require('./area-key.js'),
  FlameGraph: require('./flame-graph.js'),
  Toolbar: require('./toolbar.js')

  // TODO: add these ↴
  // FrameInfo: require('./frame-info.js'),
  // HoverBox: require('./hover-box.js'),
  // IndicatorArrow: require('./indicator-arrow.js'),
  // OptionsMenu: require('./options-menu.js'),
  // SearchBox: require('./search-box.js'),
  // StackedBar: require('./stacked-bar.js'),
  // TimeFilter: require('./time-filter.js'),
}
