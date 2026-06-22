'use strict'

const common = require('electron-installer-common')
const spawn = require('./spawn')

const dependencyMap = {
  atspi: 'at-spi2-core',
  drm: '(libdrm or libdrm2)',
  gbm: '(mesa-libgbm or libgbm1)',
  gconf: 'GConf2',
  glib2: 'glib2',
  gtk2: 'gtk2',
  gtk3: 'gtk3',
  gvfs: 'gvfs-client',
  kdeCliTools: ['kde-cli-tools', 'kde-cli-tools5'],
  kdeRuntime: 'kde-runtime',
  notify: '(libnotify or libnotify4)',
  nss: '(nss or mozilla-nss)',
  trashCli: 'trash-cli',
  uuid: '(libuuid or libuuid1)',
  xcbDri3: '(libxcb or libxcb1)',
  xdgUtils: 'xdg-utils',
  xss: 'libXScrnSaver',
  xtst: '(libXtst or libXtst6)'
}

/**
 * Retrieves the RPM version number and determines whether it has support for boolean
 * dependencies (>= 4.13.0).
 */
async function rpmSupportsBooleanDependencies (logger) {
  return rpmVersionSupportsBooleanDependencies(await getRpmVersion(logger))
}

/**
 * Retrieves the RPM version number and determines the path to the `usr` directory based on the version.
 */
async function getRpmUsrPath (logger) {
  return rpmUsrPath(await getRpmVersion(logger))
}

async function getRpmVersion (logger) {
  const versionOutput = await spawn('rpmbuild', ['--version'], logger)
  return versionOutput.trim().split(' ').at(-1)
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
 * Determines the path to the `usr` directory based on the RPM version.
 */
function rpmUsrPath (rpmVersionString) {
  const rpmVersion = rpmVersionString.split('.').slice(0, 3).map(n => parseInt(n))
  return rpmVersion >= [4, 20, 0] ? '../usr/.' : 'usr/*'
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
      throw new Error('Please upgrade to RPM 4.13 or above, which supports boolean dependencies.\nThis is used to express Electron dependencies for a wide variety of RPM-using distributions.')
    }
  },
  getRpmVersion,
  getRpmUsrPath,
  rpmSupportsBooleanDependencies,
  rpmVersionSupportsBooleanDependencies,
  trashRequiresAsBoolean
}
