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

module.exports = {
  getHomePage: getHomePage
}
