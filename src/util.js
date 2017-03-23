/**
 * Determine the homepage based on the settings in `package.json`.
 */
function getHomePage (pkg) {
  var parseAuthor = require('parse-author')
  var homepage = ''

  if (pkg.homepage) {
    homepage = pkg.homepage
  } else if (pkg.author) {
    if (typeof pkg.author === 'string') {
      homepage = parseAuthor(pkg.author).url
    } else if (pkg.author.url) {
      homepage = pkg.author.url
    }
  }

  return homepage
}

/**
 * Returns a string containing only characters that are allowed in the version field of RPM spec files
 */
function replaceInvalidVersionCharacters (version) {
  version = version || ''
  return version.replace(/[-]/g, '.')
}

module.exports = {
  getHomePage: getHomePage,
  replaceInvalidVersionCharacters: replaceInvalidVersionCharacters
}
