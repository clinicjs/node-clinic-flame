#!/usr/bin/env node

var chokidar = require('chokidar')
var v = require('./visualize-mod.js')

chokidar
  .watch([
    'visualizer/**/*.css',
    'visualizer/**/*.js'
  ], {
    ignoreInitial: true
  })
  .on('all', (event, path) => {
    console.log(event, path)
    v.visualize()
  })
