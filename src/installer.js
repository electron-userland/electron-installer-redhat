'use strict'

const _ = require('lodash')
const asar = require('asar')
const debug = require('debug')
const fs = require('fs-extra')
const glob = require('glob-promise')
const nodeify = require('nodeify')
const path = require('path')
const tmp = require('tmp-promise')
const wrap = require('word-wrap')

const spawn = require('./spawn')
const util = require('./util')

const defaultLogger = debug('electron-installer-redhat')

const defaultRename = function (dest, src) {
  return path.join(dest, '<%= name %>-<%= version %>.<%= arch %>.rpm')
}

function errorMessage (message, err) {
  return `Error ${message}: ${err.message || err}`
}

function wrapError (message) {
  return err => {
    throw new Error(errorMessage(message, err))
  }
}

/**
 * Read `package.json` either from `resources.app.asar` (if the app is packaged)
 * or from `resources/app/package.json` (if it is not).
 */
const readMeta = function (options) {
  const withAsar = path.join(options.src, 'resources/app.asar')
  const withoutAsar = path.join(options.src, 'resources/app/package.json')

  return fs.pathExists(withAsar)
    .then(asarExists => {
      if (asarExists) {
        options.logger(`Reading package metadata from ${withAsar}`)
        return JSON.parse(asar.extractFile(withAsar, 'package.json'))
      } else {
        options.logger(`Reading package metadata from ${withoutAsar}`)
        return fs.readJsonSync(withoutAsar)
      }
    })
}

/**
 * Read `LICENSE` from the root of the app.
 */
const readLicense = function (options) {
  const licenseSrc = path.join(options.src, 'LICENSE')
  options.logger(`Reading license file from ${licenseSrc}`)

  return fs.readFile(licenseSrc)
}

/**
 * Get the hash of default options for the installer. Some come from the info
 * read from `package.json`, and some are hardcoded.
 */
const getDefaults = function (data) {
  return readMeta(data)
    .then(pkg => {
      pkg = pkg || {}

      return {
        name: pkg.name || 'electron',
        productName: pkg.productName || pkg.name,
        genericName: pkg.genericName || pkg.productName || pkg.name,
        description: pkg.description,
        productDescription: pkg.productDescription || pkg.description,
        version: pkg.version || '0.0.0',
        revision: pkg.revision || '1',
        license: pkg.license,

        group: undefined,

        arch: undefined,

        requires: [
          'lsb',
          'libXScrnSaver'
        ],

        homepage: util.getHomePage(pkg),

        compressionLevel: 2,
        bin: pkg.name || 'electron',
        execArguments: [],
        icon: path.resolve(__dirname, '../resources/icon.png'),

        categories: [
          'GNOME',
          'GTK',
          'Utility'
        ],

        pre: undefined,
        post: undefined,
        preun: undefined,
        postun: undefined,

        mimeType: []
      }
    })
}

/**
 * Read scripts from provided filename and add them to the options
 */
const generateScripts = function (options) {
  const scriptNames = ['pre', 'post', 'preun', 'postun']

  return Promise.all(_.map(options.scripts, (item, key) => {
    // TODO: Replace lodash with Array.prototype.includes
    if (_.includes(scriptNames, key)) {
      options.logger(`Creating installation script ${key}`)
      return fs.readFile(item)
        .then(script => (options[key] = script.toString()))
    }
  })).then(() => options)
}

/**
 * Get the hash of options for the installer.
 */
const getOptions = function (data, defaults) {
  // Flatten everything for ease of use.
  const options = _.defaults({}, data, data.options, defaults)

  // Wrap the extended description to avoid rpmlint warning about
  // `description-line-too-long`.
  options.productDescription = wrap(options.productDescription, {width: 100, indent: ''})

  // Scan if there are any installation scripts and adds them to the options
  return generateScripts(options)
}

/**
 * Fill in a template with the hash of options.
 */
const generateTemplate = function (options, file) {
  options.logger(`Generating template from ${file}`)

  return fs.readFile(file)
    .then(template => {
      const result = _.template(template)(options)
      options.logger(`Generated template from ${file} \n${result}`)
      return result
    })
}

/**
 * Create the spec file for the package.
 *
 * See: https://fedoraproject.org/wiki/How_to_create_an_RPM_package
 */
const createSpec = function (options, dir) {
  const specSrc = path.resolve(__dirname, '../resources/spec.ejs')
  const specDest = path.join(dir, 'SPECS', options.name + '.spec')
  options.logger(`Creating spec file at ${specDest}`)

  return generateTemplate(options, specSrc)
    .then(result => fs.outputFile(specDest, result))
    .catch(wrapError('creating spec file'))
}

/**
 * Create the binary for the package.
 */
const createBinary = function (options, dir) {
  const binDir = path.join(dir, 'BUILD/usr/bin')
  const binSrc = path.join('../lib', options.name, options.bin)
  const binDest = path.join(binDir, options.name)
  options.logger(`Symlinking binary from ${binSrc} to ${binDest}`)

  return fs.ensureDir(binDir)
    .then(() => fs.symlink(binSrc, binDest, 'file'))
    .catch(wrapError('creating binary file'))
}

/**
 * Create the desktop file for the package.
 *
 * See: http://standards.freedesktop.org/desktop-entry-spec/latest/
 */
const createDesktop = function (options, dir) {
  const desktopSrc = path.resolve(__dirname, '../resources/desktop.ejs')
  const desktopDest = path.join(dir, 'BUILD/usr/share/applications', options.name + '.desktop')
  options.logger(`Creating desktop file at ${desktopDest}`)

  return generateTemplate(options, desktopSrc)
    .then(template => fs.outputFile(desktopDest, template))
    .catch(wrapError('creating desktop file'))
}

/**
 * Create pixmap icon for the package.
 */
const createPixmapIcon = function (options, dir) {
  const iconFile = path.join(dir, 'BUILD/usr/share/pixmaps', options.name + '.png')
  options.logger(`Creating icon file at ${iconFile}`)

  return fs.copy(options.icon, iconFile)
    .catch(wrapError('creating pixmap icon file'))
}

/**
 * Create hicolor icon for the package.
 */
const createHicolorIcon = function (options, dir) {
  return Promise.all(_.map(options.icon, (icon, resolution) => {
    const iconFile = path.join(dir, 'BUILD/usr/share/icons/hicolor', resolution, 'apps', options.name + '.png')
    options.logger(`Creating icon file at ${iconFile}`)

    return fs.copy(icon, iconFile)
      .catch(wrapError('creating hicolor icon file'))
  }))
}

/**
 * Create icon for the package.
 */
const createIcon = function (options, dir) {
  if (_.isObject(options.icon)) {
    return createHicolorIcon(options, dir)
  } else {
    return createPixmapIcon(options, dir)
  }
}

/**
 * Create copyright for the package.
 */
const createCopyright = function (options, dir) {
  const copyrightFile = path.join(dir, 'BUILD/usr/share/doc', options.name, 'copyright')
  options.logger(`Creating copyright file at ${copyrightFile}`)

  return readLicense(options)
    .then(license => fs.outputFile(copyrightFile, license))
    .catch(wrapError('creating copyright file'))
}

/**
 * Copy the application into the package.
 */
const createApplication = function (options, dir) {
  const applicationDir = path.join(dir, 'BUILD/usr/lib', options.name)
  options.logger(`Copying application to ${applicationDir}`)

  return fs.ensureDir(applicationDir)
    .then(() => fs.copy(options.src, applicationDir))
    .catch(wrapError('copying application directory'))
}

/**
 * Create temporary directory where the contents of the package will live.
 */
const createDir = function (options) {
  options.logger('Creating temporary directory')
  let tmpDir

  return tmp.dir({prefix: 'electron-', unsafeCleanup: true})
    .then(dir => {
      options.logger(`DIR: ${dir}`)
      tmpDir = path.join(dir.path, `${options.name}_${options.version}_${options.arch}`)
      options.logger(`DIR: ${tmpDir}`)
      return fs.ensureDir(tmpDir)
    })
    .then(() => tmpDir)
    .catch(wrapError('creating temporary directory'))
}

/**
 * Create macros file used by `rpmbuild`.
 */
const createMacros = function (options, dir) {
  const macrosSrc = path.resolve(__dirname, '../resources/macros.ejs')
  const macrosDest = path.join(process.env.HOME, '.rpmmacros')
  options.logger(`Creating macros file at ${macrosDest}`)

  return generateTemplate(_.assign({dir: dir}, options), macrosSrc)
    .then(template => fs.outputFile(macrosDest, template))
    .then(() => dir)
    .catch(wrapError('creating macros file'))
}

/**
 * Create the contents of the package.
 */
const createContents = function (options, dir) {
  options.logger('Creating contents of package')

  return Promise.all([
    createSpec,
    createBinary,
    createDesktop,
    createIcon,
    createCopyright,
    createApplication
  ].map(func => func(options, dir)))
    .then(() => dir)
    .catch(wrapError('creating contents of package'))
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
const movePackage = function (options, dir) {
  options.logger('Moving package to destination')

  const packagePattern = path.join(dir, 'RPMS', options.arch, '*.rpm')

  return glob(packagePattern)
    .then(files => Promise.all(files.map(file => {
      const template = options.rename(options.dest, path.basename(file))
      const dest = _.template(template)(options)
      options.logger(`Moving file ${file} to ${dest}`)
      return fs.move(file, dest, {clobber: true})
    })))
    .catch(wrapError('moving package files'))
}

/* ************************************************************************** */

module.exports = function (data, callback) {
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
    })
    .then(() => createDir(options))
    .then(dir => createMacros(options, dir))
    .then(dir => createContents(options, dir))
    .then(dir => createPackage(options, dir))
    .then(dir => movePackage(options, dir))
    .then(() => {
      data.logger(`Successfully created package at ${options.dest}`)
      return options
    }).catch(err => {
      data.logger(errorMessage('creating package', err))
      throw err
    })

  return nodeify(promise, callback)
}
