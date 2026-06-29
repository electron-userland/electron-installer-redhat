'use strict'

const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const tmp = require('tmp-promise')

const installer = require('../..')

module.exports = {
  describeInstaller: function describeInstaller (description, installerOptions, itDescription, itFunc) {
    describe(description, () => {
      const outputDir = module.exports.tempOutputDir(installerOptions.dest)
      const options = module.exports.testInstallerOptions(outputDir, installerOptions)

      before(async () => installer(options))

      it(itDescription, () => itFunc(outputDir))

      module.exports.cleanupOutputDir(outputDir)
    })
  },

  cleanupOutputDir: function cleanupOutputDir (outputDir) {
    after(async () => fs.rm(outputDir, { recursive: true, force: true }))
  },

  tempOutputDir: function tempOutputDir (customDir) {
    return customDir ? path.join(os.tmpdir(), customDir) : tmp.tmpNameSync({ prefix: 'electron-installer-redhat-' })
  },

  testInstallerOptions: function testInstallerOptions (outputDir, installerOptions) {
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
}
