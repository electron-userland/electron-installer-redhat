import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import tmp from 'tmp-promise'

import installer from '../../src/installer.js'

export function describeInstaller (description, installerOptions, itDescription, itFunc) {
  describe(description, () => {
    const outputDir = tempOutputDir(installerOptions.dest)
    const options = testInstallerOptions(outputDir, installerOptions)

    before(async () => installer(options))

    it(itDescription, () => itFunc(outputDir))

    cleanupOutputDir(outputDir)
  })
}

export function cleanupOutputDir (outputDir) {
  after(async () => fs.rm(outputDir, { recursive: true, force: true }))
}

export function tempOutputDir (customDir) {
  return customDir ? path.join(os.tmpdir(), customDir) : tmp.tmpNameSync({ prefix: 'electron-installer-redhat-' })
}

export function testInstallerOptions (outputDir, installerOptions) {
  return {
    rename: rpmFile => {
      return path.join(rpmFile, '<%= name %>.<%= arch %>.rpm')
    },
    ...installerOptions,
    options: {
      arch: 'x86_64',
      ...installerOptions.options
    },
    dest: outputDir
  }
}
