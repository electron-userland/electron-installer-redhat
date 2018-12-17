'use strict'

const _ = require('lodash')

/**
 * Returns a string containing only characters that are allowed in the version field of RPM spec files
 */
function replaceInvalidVersionCharacters (version) {
  version = version || ''
  return version.replace(/[-]/g, '.')
}
/**
 *  Create array with unique values from default & user-supplied dependencies
 */
function mergeDependencies (data, defaults) {
  if (data.options) { // options passed programmatically
    return _.union(defaults.requires, data.options.requires)
  } else { // options passed via command-line
    return _.union(defaults.requires, data.requires)
  }
}

module.exports = {
  replaceInvalidVersionCharacters: replaceInvalidVersionCharacters,
  mergeDependencies: mergeDependencies
}
