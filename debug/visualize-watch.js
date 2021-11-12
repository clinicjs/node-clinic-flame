#!/usr/bin/env node

const chokidar = require('chokidar')
const chalk = require('chalk')
const v = require('./visualize-mod.js')

const buildImg = require('@clinic/clinic-common/scripts/build-images')
// build images
const path = require('path')
const imgDestDir = path.join(__dirname, '../visualizer/assets/images')

const debounce = require('lodash.debounce')

// this is useful when updating multiple files in just one go (i.e. checking-out a branch)
const debVisualize = debounce(v.visualize, 100)

// building the images
chokidar
  .watch([
    'visualizer/assets/images/*.png',
    'visualizer/assets/images/*.jpeg',
    'visualizer/assets/images/*.jpg',
    'visualizer/assets/images/*.gif'
  ])
  .on('add', (path) => {
    console.log(chalk.green('Image:'), path)
    buildImg.file(path, imgDestDir)
  })
  .on('change', (path) => {
    console.log(chalk.green('Image:'), path)
    buildImg.file(path, imgDestDir)
  })

// building css and js files
chokidar
  .watch([
    'visualizer/**/*.css',
    'visualizer/**/*.js',
    'index.js'
  ], {
    ignoreInitial: true,
    ignored: [
      'visualizer/assets'
    ]
  })
  .on('all', (event, path) => {
    console.log(chalk.blue(event.toUpperCase()), path)
    debVisualize()
  })

v.visualize()
