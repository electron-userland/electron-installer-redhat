'use strict'

const access = require('./helpers/access')
const { describeInstaller, tempOutputDir, testInstallerOptions } = require('./helpers/describe_installer')
const fs = require('fs-extra')
const installer = require('..')
const path = require('path')
const { spawn } = require('@malept/cross-spawn-promise')
const os = require('os')

const assertASARRpmExists = outputDir =>
  access(path.join(outputDir, 'footest.x86.rpm'))

const assertNonASARRpmExists = outputDir =>
  access(path.join(outputDir, 'bartest.x86_64.rpm'))

const updateJSON = async (filename, updateFunc) => {
  const packageJSON = await fs.readJson(filename)
  updateFunc(packageJSON)
  await fs.writeJson(filename, packageJSON)
}

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

    after(async () => fs.remove(baseDir))
    after(async () => fs.remove(outputDir))

    before(async () => {
      await fs.emptyDir(baseDir)
      await fs.copy('test/fixtures/app-without-asar', baseDir)
      await updateJSON(path.join(baseDir, 'resources', 'app', 'package.json'), packageJSON => {
        packageJSON.author = 'Test Author'
      })
      outputDir = tempOutputDir()
      await installer(testInstallerOptions(outputDir, { src: baseDir }))
    })

    it('generates a `.rpm` package', () => assertNonASARRpmExists(outputDir))
  })

  describe('with an app having hyphens in its version string', test => {
    const baseDir = tempOutputDir('app-with-hyphen')
    let outputDir

    after(async () => fs.remove(baseDir))
    after(async () => fs.remove(outputDir))

    before(async () => {
      await fs.emptyDir(baseDir)
      await fs.copy('test/fixtures/app-without-asar', baseDir)
      await updateJSON(path.join(baseDir, 'resources', 'app', 'package.json'), packageJSON => {
        packageJSON.version = '1.0.0-beta+internal-only.0'
      })
      outputDir = tempOutputDir()
      await installer(testInstallerOptions(outputDir, { src: baseDir }))
    })

    it('generates a `.rpm` package', () => assertNonASARRpmExists(outputDir))
  })

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
    'with an app with an SVG icon',
    {
      src: 'test/fixtures/app-with-asar/',
      options: {
        arch: 'x86',
        icon: {
          scalable: 'test/fixtures/scaled-icon.svg',
          symbolic: 'test/fixtures/scaled-icon.svg'
        }
      }
    },
    'generates a .rpm package',
    assertASARRpmExists
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
    async outputDir => {
      await assertNonASARRpmExists(outputDir)
      const stdout = await spawn('rpm', ['-qp', '--scripts', 'bartest.x86_64.rpm'], { cwd: outputDir })
      const scripts = ['preinstall', 'postinstall', 'preuninstall', 'postuninstall']
      if (!scripts.every(element => stdout.includes(element))) {
        throw new Error(`Some installation scripts are missing:\n ${stdout}`)
      }
    }
  )

  describeInstaller(
    'with an app with default %_target_os',
    {
      src: 'test/fixtures/app-with-asar/',
      options: {
        arch: 'x86'
      }
    },
    'generates a `.rpm` package with default %_target_os',
    async outputDir => {
      await assertASARRpmExists(outputDir)
      const stdout = await spawn('rpm', ['-qp', '--qf', '\'%{OS}\'', 'footest.x86.rpm'], { cwd: outputDir })
      return stdout === os.platform()
    }
  )

  describeInstaller(
    'with an app with %_target_os linux',
    {
      src: 'test/fixtures/app-with-asar/',
      options: {
        arch: 'x86',
        os: 'linux'
      }
    },
    'generates a `.rpm` package with linux %_target_os',
    async outputDir => {
      await assertASARRpmExists(outputDir)
      const stdout = await spawn('rpm', ['-qp', '--qf', '\'%{OS}\'', 'footest.x86.rpm'], { cwd: outputDir })
      return stdout === 'linux'
    }
  )
})
