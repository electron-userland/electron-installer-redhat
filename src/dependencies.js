'use strict'

const common = require('electron-installer-common')
const spawn = require('./spawn')

const dependencyMap = {
  atspi: 'at-spi2-core',
  gconf: 'GConf2',
  glib2: 'glib2',
  gtk2: 'gtk2',
  gtk3: 'gtk3',
  gvfs: 'gvfs-client',
  kdeCliTools: 'kde-cli-tools',
  kdeRuntime: 'kde-runtime',
  notify: 'libnotify',
  nss: 'nss',
  trashCli: 'trash-cli',
  uuid: 'libuuid',
  xdgUtils: 'xdg-utils',
  xss: 'libXScrnSaver',
  xtst: 'libXtst'
}

/**
 * Retrieves the RPM version number and determines whether it has support for boolean
 * dependencies (>= 4.13.0).
 */
async function rpmSupportsBooleanDependencies (logger) {
  const output = await spawn('rpmbuild', ['--version'], logger)
  return rpmVersionSupportsBooleanDependencies(output.trim().split(' ')[2])
}

/**
 * Determine whether the RPM version string has support for boolean dependencies (>= 4.13.0).
 *
 * RPM does not follow semantic versioning, so `semver` cannot be used.
 */
function rpmVersionSupportsBooleanDependencies (rpmVersionString) {
  const rpmVersion = rpmVersionString.split('.').slice(0, 3).map(n => parseInt(n))
  return rpmVersion >= [4, 13, 0]
}

/**
 * Transforms the list of trash requires into an RPM boolean dependency list.
 */
function trashRequiresAsBoolean (electronVersion, dependencyMap) {
  const trashDepends = common.getTrashDepends(electronVersion, dependencyMap)
  if (trashDepends.length === 1) {
    return [trashDepends[0]]
  } else {
    return [`(${trashDepends.join(' or ')})`]
  }
}

module.exports = {
  dependencyMap,
  /**
   * The dependencies for Electron itself, given an Electron version.
   */
  forElectron: async function dependenciesForElectron (electronVersion, logger) {
    const requires = common.getDepends(electronVersion, dependencyMap)
    if (await module.exports.rpmSupportsBooleanDependencies(logger)) {
      const trashRequires = trashRequiresAsBoolean(electronVersion, dependencyMap)
      return { requires: requires.concat(trashRequires) }
    } else {
      console.warn("You are using RPM < 4.13, which does not support boolean dependencies. This is required to express the dependencies needed for the 'shell.moveItemToTrash' API.\nIf you do not use this API, you can safely ignore this warning.\nIf you do use this API, please upgrade to RPM 4.13 or above to have the trash dependencies added to your RPM's requires section.")
      return { requires }
    }
  },
  rpmSupportsBooleanDependencies,
  rpmVersionSupportsBooleanDependencies,
  trashRequiresAsBoolean
}
