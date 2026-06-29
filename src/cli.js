#!/usr/bin/env node

const yargs = require('yargs')
const { hideBin } = require('yargs/helpers')

const installer = require('./installer')
const pkg = require('../package.json')

const argv = yargs(hideBin(process.argv))
  .version(pkg.version)
  .usage(pkg.description + '\n\nUsage: $0 --src <inputdir> --dest <outputdir> --arch <architecture>')
  .option('src', {
    describe: 'Directory that contains your built Electron app (e.g. with `electron-packager`)',
    demandOption: true
  })
  .option('dest', {
    describe: 'Directory that will contain the resulting Red Hat installer',
    demandOption: true
  })
  .option('arch', {
    describe: 'Machine architecture the package is targeted to',
    demandOption: true
  })
  .option('config', {
    describe: 'JSON file that contains the metadata for your application',
    config: true
  })
  .options('options.requires', { array: true, hidden: true })
  .options('options.execArguments', { array: true, hidden: true })
  .options('options.categories', { array: true, hidden: true })
  .options('options.mimeType', { array: true, hidden: true })
  .example('$0 --src dist/app/ --dest dist/installer/ --arch i386', 'use metadata from `dist/app/`')
  .example('$0 --src dist/app/ --dest dist/installer/ --config config.json', 'use metadata from `config.json`')
  .wrap(null)
  .parse()

console.log('Creating package (this may take a while)')

const { $0, _, version, ...options } = argv
installer(options)
  .then(() => console.log(`Successfully created package at ${argv.dest}`))
  .catch(err => {
    console.error(err, err.stack)
    process.exitCode = 1
  })
