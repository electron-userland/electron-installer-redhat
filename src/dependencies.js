'use strict'

const dependencies = require('electron-installer-common/src/dependencies')

const dependencyMap = {
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
 * Transforms the list of trash requires into an RPM boolean dependency list.
 */
function trashRequiresAsBoolean (electronVersion, dependencyMap) {
  const trashDepends = dependencies.getTrashDepends(electronVersion, dependencyMap)
  if (trashDepends.length === 1) {
    return [trashDepends[0]]
  } else {
    return [`(${trashDepends.join(' or ')})`]
  }
}

module.exports = {
  /**
   * The dependencies for Electron itself, given an Electron version.
   */
  forElectron: function dependenciesForElectron (electronVersion) {
    return {
      requires: dependencies.getDepends(electronVersion, dependencyMap)
        .concat(trashRequiresAsBoolean(electronVersion, dependencyMap))
    }
  }
}
