#!/usr/bin/env node
const chalk = require('chalk')
const Tool = require('../')

module.exports = {
  visualize: () => {
    for (const file of process.argv.slice(2).map(trim)) {
      const tool = new Tool({ debug: true })

      console.log(chalk.blue('building...'))
      tool.visualize(
        file,
        file + '.html',
        function (err) {
          if (err) {
            throw err
          } else {
            console.log('-------')
            console.log(chalk.bgBlue(' WROTE '), file + '.html')
          }
        }
      )
    }
  }
}

function trim (file) {
  return file.replace(/\/\\$/, '')
}
