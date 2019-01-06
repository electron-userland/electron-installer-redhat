'use strict'

const fs = require('fs-extra')
const path = require('path')

const installer = require('..')

const { exec } = require('mz/child_process')
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

  describe('with an app without a homepage or author URL', test => {
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
        .then(pkgJSON => {
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

  describe('with an app having hyphens in its version string', test => {
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
        .then(pkgJSON => {
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

  describeInstaller(
    'with an app with a scoped name',
    {
      src: 'test/fixtures/app-with-asar/',
      options: { name: '@scoped/myapp' }
    },
    'generates a .rpm package',
    outputDir => access(path.join(outputDir, 'scoped-myapp.x86_64.rpm'))
  )

  describeInstaller(
    'with an app that needs its name sanitized',
    {
      src: 'test/fixtures/app-with-asar/',
      options: { name: 'Foo/Bar/Baz' }
    },
    'generates a .rpm package',
    outputDir => access(path.join(outputDir, 'Foo-Bar-Baz.x86_64.rpm'))
  )

  describeInstaller(
    'with an app with installation scripts as paths',
    {
      src: 'test/fixtures/app-without-asar/',
      options: {
        scripts: {
          pre: 'test/fixtures/script',
          preun: 'test/fixtures/script',
          post: 'test/fixtures/script',
          postun: 'test/fixtures/script'
        }
      }
    },
    'generates a `.rpm` package with scripts',
    outputDir => assertNonASARRpmExists(outputDir)
      .then(() => exec('rpm -qp --scripts bartest.x86_64.rpm', { cwd: outputDir }))
      .then(stdout => {
        stdout = stdout.toString()
        const scripts = ['preinstall', 'postinstall', 'preuninstall', 'postuninstall']
        if (!scripts.every(element => stdout.includes(element))) {
          throw new Error(`Some installation scripts are missing:\n ${stdout}`)
        }
        return Promise.resolve
      })
  )

  describeInstaller(
    'with a custom desktop template',
    {
      src: 'test/fixtures/app-without-asar/',
      options: {
        desktopTemplate: 'test/fixtures/custom.desktop.ejs'
      }
    },
    'generates a custom `.desktop` file',
    outputDir =>
      assertNonASARRpmExists(outputDir)
        .then(() => exec('rpm2cpio bartest.x86_64.rpm | cpio -i --to-stdout *.desktop > custom.desktop', { cwd: outputDir }))
        .then(() => fs.readFile(path.join(outputDir, 'custom.desktop')))
        .then(data => {
          if (!data.toString().includes('Comment=Hardcoded comment')) {
            throw new Error('Did not use custom template')
          }
          return Promise.resolve()
        })
  )
})
