'use strict'

const fs = require('fs-extra')
const path = require('path')

const installer = require('..')

const access = require('./helpers/access')
const describeInstaller = require('./helpers/describe_installer')
const tempOutputDir = describeInstaller.tempOutputDir
const testInstallerOptions = describeInstaller.testInstallerOptions

const assertASARRpmExists = outputDir =>
  access(path.join(outputDir, 'footest.x86.rpm'))

const assertNonASARRpmExists = outputDir =>
  access(path.join(outputDir, 'bartest.x86_64.rpm'))

describe('module', function () {
  this.timeout(10000)

  describeInstaller(
    'with an app with asar',
    {
      src: 'test/fixtures/app-with-asar/',
      options: {
        productDescription: 'Just a test.',
        arch: 'x86'
      }
    },
    'generates a `.rpm` package',
    assertASARRpmExists
  )

  describeInstaller(
    'with an app without asar',
    {
      src: 'test/fixtures/app-without-asar/',
      icon: {
        '1024x1024': 'test/fixtures/icon.png'
      },
      bin: 'resources/cli/bar.sh',
      productDescription: 'Just a test.',
      categories: [
        'Utility'
      ],
      mimeType: [
        'text/plain'
      ]
    },
    'generates a `.rpm` package',
    assertNonASARRpmExists
  )

  describe('with an app without a homepage or author URL', (test) => {
    const baseDir = tempOutputDir('app-without-homepage')
    let outputDir

    after(() => fs.remove(baseDir))
    after(() => fs.remove(outputDir))

    before(() => {
      let pkgJSONFilename
      return fs.emptyDir(baseDir)
        .then(() => fs.copy('test/fixtures/app-without-asar', baseDir))
        .then(() => {
          pkgJSONFilename = path.join(baseDir, 'resources', 'app', 'package.json')
          return pkgJSONFilename
        })
        .then(file => fs.readJson(file))
        .then((pkgJSON) => {
          pkgJSON.author = 'Test Author'
          return fs.writeJson(pkgJSONFilename, pkgJSON)
        })
        .then(() => tempOutputDir())
        .then(tmpdir => {
          outputDir = tmpdir
          return testInstallerOptions(outputDir, { src: baseDir })
        })
        .then(options => installer(options))
    })

    it('generates a `.rpm` package', () => assertNonASARRpmExists(outputDir))
  })

  describe('with an app having hyphens in its version string', (test) => {
    const baseDir = tempOutputDir('app-with-hyphen')
    let outputDir

    after(() => fs.remove(baseDir))
    after(() => fs.remove(outputDir))

    before(() => {
      let pkgJSONFilename
      return fs.emptyDir(baseDir)
        .then(() => fs.copy('test/fixtures/app-without-asar', baseDir))
        .then(() => {
          pkgJSONFilename = path.join(baseDir, 'resources', 'app', 'package.json')
          return pkgJSONFilename
        })
        .then(file => fs.readJson(file))
        .then((pkgJSON) => {
          pkgJSON.version = '1.0.0-beta+internal-only.0'
          return fs.writeJson(pkgJSONFilename, pkgJSON)
        })
        .then(() => tempOutputDir())
        .then(tmpdir => {
          outputDir = tmpdir
          return testInstallerOptions(outputDir, { src: baseDir })
        })
        .then(options => installer(options))
    })

    it('generates a `.rpm` package', () => assertNonASARRpmExists(outputDir))
  })
})
