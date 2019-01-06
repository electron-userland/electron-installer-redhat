'use strict'

const _ = require('lodash')
const common = require('electron-installer-common')
const debug = require('debug')
const fs = require('fs-extra')
const nodeify = require('nodeify')
const path = require('path')
const wrap = require('word-wrap')

const redhatDependencies = require('./dependencies')
const spawn = require('./spawn')
const util = require('./util')

const defaultLogger = debug('electron-installer-redhat')

const defaultRename = function (dest, src) {
  return path.join(dest, '<%= name %>-<%= version %>.<%= arch %>.rpm')
}

/**
 * Get the hash of default options for the installer. Some come from the info
 * read from `package.json`, and some are hardcoded.
 */
const getDefaults = function (data) {
  return common.readElectronVersion(data.src)
    .then(electronVersion => Promise.all([common.readMeta(data), redhatDependencies.forElectron(electronVersion, data.logger)]))
    .then(([pkg, requires]) => {
      if (!pkg) {
        pkg = {}
      }

      return Object.assign(common.getDefaultsFromPackageJSON(pkg), {
        version: pkg.version || '0.0.0',
        license: pkg.license,
        compressionLevel: 2,
        icon: path.resolve(__dirname, '../resources/icon.png'),

        pre: undefined,
        post: undefined,
        preun: undefined,
        postun: undefined
      }, requires)
    })
}

/**
 * Read scripts from provided filename and add them to the options
 */
const generateScripts = function (options) {
  const scriptNames = ['pre', 'post', 'preun', 'postun']

  return Promise.all(_.map(options.scripts, (item, key) => {
    if (scriptNames.includes(key)) {
      options.logger(`Creating installation script ${key}`)
      return fs.readFile(item)
        .then(script => (options[key] = script.toString()))
    }
  })).then(() => options)
}

/**
 * Get the hash of options for the installer.
 */
function getOptions (data, defaults) {
  // Flatten everything for ease of use.
  const options = _.defaults({}, data, data.options, defaults)

  options.name = common.sanitizeName(options.name, '-._+a-zA-Z0-9')

  if (!options.description && !options.productDescription) {
    throw new Error(`No Description or ProductDescription provided. Please set either a description in the app's package.json or provide it in the options.`)
  }

  if (options.description) {
    // Do not end with a period
    options.description = options.description.replace(/\.*$/, '')
  }

  // Wrap the extended description to avoid rpmlint warning about
  // `description-line-too-long`.
  options.productDescription = wrap(options.productDescription, { width: 80, indent: '' })

  // Merges user and default dependencies
  options.requires = common.mergeUserSpecified(data, 'requires', defaults)

  // Scan if there are any installation scripts and adds them to the options
  return generateScripts(options)
}

/**
 * Create the spec file for the package.
 *
 * See: https://fedoraproject.org/wiki/How_to_create_an_RPM_package
 */
function createSpec (options, dir) {
  const specSrc = path.resolve(__dirname, '../resources/spec.ejs')
  const specDest = path.join(dir, 'SPECS', options.name + '.spec')
  options.logger(`Creating spec file at ${specDest}`)

  return common.generateTemplate(options, specSrc)
    .then(result => fs.outputFile(specDest, result))
    .catch(common.wrapError('creating spec file'))
}

function createBinary (options, dir) {
  return common.createBinary(options, dir, 'BUILD')
}

function createDesktop (options, dir) {
  const desktopSrc = options.desktopTemplate || path.resolve(__dirname, '../resources/desktop.ejs')
  return common.createDesktop(options, dir, desktopSrc, 'BUILD')
}

function createIcon (options, dir) {
  return common.createIcon(options, dir, 'BUILD')
}

function createCopyright (options, dir) {
  return common.createCopyright(options, dir, 'BUILD')
}

/**
 * Copy the application into the package.
 */
function createApplication (options, dir) {
  return common.copyApplication(options, dir, 'BUILD')
}

/**
 * Create macros file used by `rpmbuild`.
 */
function createMacros (options, dir) {
  const macrosSrc = path.resolve(__dirname, '../resources/macros.ejs')
  const macrosDest = path.join(process.env.HOME, '.rpmmacros')
  options.logger(`Creating macros file at ${macrosDest}`)

  return common.generateTemplate(_.assign({dir: dir}, options), macrosSrc)
    .then(template => fs.outputFile(macrosDest, template))
    .then(() => dir)
    .catch(common.wrapError('creating macros file'))
}

/**
 * Create the contents of the package.
 */
function createContents (options, dir) {
  return common.createContents(options, dir, [
    createSpec,
    createBinary,
    createDesktop,
    createIcon,
    createCopyright,
    createApplication
  ])
}

/**
 * Package everything using `rpmbuild`.
 */
const createPackage = function (options, dir) {
  options.logger(`Creating package at ${dir}`)

  const specFile = path.join(dir, 'SPECS', options.name + '.spec')

  return spawn('rpmbuild', ['-bb', specFile, '--target', options.arch], options.logger)
    .then(output => {
      options.logger(`rpmbuild output: ${output}`)
      return dir
    })
}

/**
 * Move the package to the specified destination.
 */
function movePackage (options, dir) {
  const packagePattern = path.join(dir, 'RPMS', options.arch, '*.rpm')
  return common.movePackage(packagePattern, options, dir)
}

/* ************************************************************************** */

module.exports = (data, callback) => {
  data.rename = data.rename || defaultRename
  data.logger = data.logger || defaultLogger

  let options

  const promise = getDefaults(data)
    .then(defaults => getOptions(data, defaults))
    .then(generatedOptions => {
      options = generatedOptions
      const adjustedVersion = util.replaceInvalidVersionCharacters(options.version)
      if (adjustedVersion !== options.version) {
        data.logger('Warning: replacing disallowed characters in version to comply with SPEC format.' +
          `Changing ${options.version} to ${adjustedVersion}`)
        options.version = adjustedVersion
      }
      return data.logger(`Creating package with options\n${JSON.stringify(options, null, 2)}`)
    }).then(() => common.createDir(options))
    .then(dir => createMacros(options, dir))
    .then(dir => createContents(options, dir))
    .then(dir => createPackage(options, dir))
    .then(dir => movePackage(options, dir))
    .then(() => {
      data.logger(`Successfully created package at ${options.dest}`)
      return options
    }).catch(err => {
      data.logger(common.errorMessage('creating package', err))
      throw err
    })

  return nodeify(promise, callback)
}
