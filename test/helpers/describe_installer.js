'use strict'

const _ = require('lodash')
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const tmp = require('tmp-promise')

const installer = require('../..')

module.exports = {
  describeInstaller: function describeInstaller (description, installerOptions, itDescription, itFunc) {
    describe(description, test => {
      const outputDir = module.exports.tempOutputDir(installerOptions.dest)
      const options = module.exports.testInstallerOptions(outputDir, installerOptions)

      before(async () => installer(options))

      it(itDescription, () => itFunc(outputDir))

      module.exports.cleanupOutputDir(outputDir)
    })
  },

  cleanupOutputDir: function cleanupOutputDir (outputDir) {
    after(async () => fs.remove(outputDir))
  },

  tempOutputDir: function tempOutputDir (customDir) {
    return customDir ? path.join(os.tmpdir(), customDir) : tmp.tmpNameSync({ prefix: 'electron-installer-redhat-' })
  },

  testInstallerOptions: function testInstallerOptions (outputDir, installerOptions) {
    return _.merge({
      rename: rpmFile => {
        return path.join(rpmFile, '<%= name %>.<%= arch %>.rpm')
      },
      options: {
        arch: 'x86_64'
      }
    }, installerOptions, { dest: outputDir })
  }
}
