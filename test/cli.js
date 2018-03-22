'use strict'

const fs = require('fs-extra')
const path = require('path')

const access = require('./helpers/access')
const describeInstaller = require('./helpers/describe_installer')
const spawn = require('../src/spawn')

const tempOutputDir = describeInstaller.tempOutputDir
const cleanupOutputDir = describeInstaller.cleanupOutputDir

function runCLI (options) {
  const args = [
    '--src', options.src,
    '--dest', options.dest,
    '--arch', options.arch
  ]
  if (options.config) args.push('--config', options.config)

  before(() => spawn('./src/cli.js', args))
}

describe('cli', function () {
  this.timeout(10000)

  describe('with an app with asar', (test) => {
    const outputDir = tempOutputDir()

    runCLI({ src: 'test/fixtures/app-with-asar/', dest: outputDir, arch: 'x86' })

    it('generates a `.rpm` package', () => access(path.join(outputDir, 'footest-0.0.1.x86.rpm')))

    cleanupOutputDir(outputDir)
  })

  describe('with an app without asar', (test) => {
    const outputDir = tempOutputDir()

    runCLI({ src: 'test/fixtures/app-without-asar/', dest: outputDir, arch: 'x86_64' })

    it('generates a `.rpm` package', () => access(path.join(outputDir, 'bartest-0.0.1.x86_64.rpm')))

    after(() => fs.remove(outputDir))
  })
})
