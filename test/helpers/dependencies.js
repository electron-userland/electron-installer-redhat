'use strict'

const _ = require('lodash')
const { exec } = require('mz/child_process')

// Default options (partly from src/installer.js)
// TODO: Replace this with electron-installer-common.dependencies
const defaultsRequires = [
  'lsb',
  'libXScrnSaver'
]

module.exports = {
  assertDependenciesEqual: function assertDependenciesEqual (outputDir, rpmFilename, userDependencies) {
    return exec(`rpm -qp --requires ${rpmFilename}`, { cwd: outputDir })
      .then(stdout => {
        const baseDependencies = _.union(defaultsRequires, userDependencies.requires).sort() // Array with both user and default dependencies based on src/installer.js

        // Array of generated dependencies
        const destRequires = stdout[0]
          .split(/\n/)
          .filter(el => el !== '') // removes any empty strings from the array
          .filter(el => el.match(/^rpmlib\(/) === null) // removes rpmlib dependencies
          .sort()

        if (!_.isEqual(baseDependencies, destRequires)) {
          throw new Error('There are duplicate dependencies')
        }

        return Promise.resolve()
      })
  }
}
