import fs from 'node:fs/promises'
import path from 'node:path'

import { spawn } from '@malept/cross-spawn-promise'

import installer from '../src/installer.js'

import access from './helpers/access.js'
import { describeInstaller, tempOutputDir, testInstallerOptions } from './helpers/describe_installer.js'

const assertASARRpmExists = outputDir =>
  access(path.join(outputDir, 'footest.x86.rpm'))

const assertNonASARRpmExists = outputDir =>
  access(path.join(outputDir, 'bartest.x86_64.rpm'))

const updateJSON = async (filename, updateFunc) => {
  const packageJSON = JSON.parse(await fs.readFile(filename, 'utf8'))
  updateFunc(packageJSON)
  await fs.writeFile(filename, JSON.stringify(packageJSON, null, 2))
}

const recreateDir = async dir => {
  await fs.rm(dir, { recursive: true, force: true })
  await fs.mkdir(dir, { recursive: true })
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

  describe('with an app without a homepage or author URL', () => {
    const baseDir = tempOutputDir('app-without-homepage')
    let outputDir

    after(async () => fs.rm(baseDir, { recursive: true, force: true }))
    after(async () => fs.rm(outputDir, { recursive: true, force: true }))

    before(async () => {
      await recreateDir(baseDir)
      await fs.cp('test/fixtures/app-without-asar', baseDir, { recursive: true })
      await updateJSON(path.join(baseDir, 'resources', 'app', 'package.json'), packageJSON => {
        packageJSON.author = 'Test Author'
      })
      outputDir = tempOutputDir()
      await installer(testInstallerOptions(outputDir, { src: baseDir }))
    })

    it('generates a `.rpm` package', () => assertNonASARRpmExists(outputDir))
  })

  describe('with an app having hyphens in its version string', () => {
    const baseDir = tempOutputDir('app-with-hyphen')
    let outputDir

    after(async () => fs.rm(baseDir, { recursive: true, force: true }))
    after(async () => fs.rm(outputDir, { recursive: true, force: true }))

    before(async () => {
      await recreateDir(baseDir)
      await fs.cp('test/fixtures/app-without-asar', baseDir, { recursive: true })
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
      const stdout = await spawn('rpm', ['-qp', '--qf', '%{OS}', 'footest.x86.rpm'], { cwd: outputDir })
      if (stdout !== process.platform) {
        throw new Error(`RPM built with wrong platform: ${stdout}`)
      }
    }
  )

  describeInstaller(
    'with an app with a custom SPEC file',
    {
      src: 'test/fixtures/app-with-asar/',
      options: {
        arch: 'x86',
        specTemplate: 'test/fixtures/custom.spec.ejs'
      }
    },
    'generates a `.rpm` package with custom spec',
    async outputDir => {
      await assertASARRpmExists(outputDir)
      const stdout = await spawn('rpm', ['-qp', '--changelog', 'footest.x86.rpm'], { cwd: outputDir })
      if (!stdout.includes('* Wed Feb 02 2022 John Doe <johndoe@johndoe.com> - 0.1\n- First release')) {
        throw new Error(`RPM missing changelog:\n ${stdout}`)
      }
    }
  )

  if (process.platform === 'darwin') {
    describeInstaller(
      'with an app with %_target_os linux',
      {
        src: 'test/fixtures/app-with-asar/',
        options: {
          arch: 'x86',
          platform: 'linux'
        }
      },
      'generates a `.rpm` package with linux %_target_os',
      async outputDir => {
        await assertASARRpmExists(outputDir)
        const stdout = await spawn('rpm', ['-qp', '--qf', '%{OS}', 'footest.x86.rpm'], { cwd: outputDir })
        if (stdout !== 'linux') {
          throw new Error(`RPM was not built for linux: ${stdout}`)
        }
      }
    )
  }
})
