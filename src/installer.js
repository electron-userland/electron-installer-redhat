'use strict'

const _ = require('lodash')
const asar = require('asar')
const async = require('async')
const child = require('child_process')
const debug = require('debug')
const fs = require('fs-extra')
const glob = require('glob')
const path = require('path')
const temp = require('temp').track()
const wrap = require('word-wrap')

const util = require('./util.js')
const pkg = require('../package.json')

const defaultLogger = debug(pkg.name)

const defaultRename = function (dest, src) {
  return path.join(dest, '<%= name %>-<%= version %>.<%= arch %>.rpm')
}

/**
 * Spawn a child process.
 */
const spawn = function (options, command, args, callback) {
  let spawnedProcess = null
  let error = null
  let stderr = ''

  options.logger('Executing command ' + command + ' ' + args.join(' '))

  try {
    spawnedProcess = child.spawn(command, args)
  } catch (err) {
    process.nextTick(function () {
      callback(err, stderr)
    })
    return
  }

  spawnedProcess.stderr.on('data', function (data) {
    stderr += data
  })

  spawnedProcess.on('error', function (err) {
    error = error || err
  })

  spawnedProcess.on('close', function (code, signal) {
    if (code !== 0) {
      error = error || signal || code
    }

    callback(error && new Error('Error executing command (' + (error.message || error) + '): ' +
      '\n' + command + ' ' + args.join(' ') + '\n' + stderr))
  })
}

/**
 * Read `package.json` either from `resources.app.asar` (if the app is packaged)
 * or from `resources/app/package.json` (if it is not).
 */
const readMeta = function (options, callback) {
  const withAsar = path.join(options.src, 'resources/app.asar')
  const withoutAsar = path.join(options.src, 'resources/app/package.json')

  try {
    fs.accessSync(withAsar)
    options.logger('Reading package metadata from ' + withAsar)
    callback(null, JSON.parse(asar.extractFile(withAsar, 'package.json')))
    return
  } catch (err) {
  }

  try {
    options.logger('Reading package metadata from ' + withoutAsar)
    callback(null, fs.readJsonSync(withoutAsar))
  } catch (err) {
    callback(new Error('Error reading package metadata: ' + (err.message || err)))
  }
}

/**
 * Read `LICENSE` from the root of the app.
 */
const readLicense = function (options, callback) {
  const licenseSrc = path.join(options.src, 'LICENSE')
  options.logger('Reading license file from ' + licenseSrc)

  fs.readFile(licenseSrc, callback)
}

/**
 * Get the hash of default options for the installer. Some come from the info
 * read from `package.json`, and some are hardcoded.
 */
const getDefaults = function (data, callback) {
  readMeta(data, function (err, pkg) {
    pkg = pkg || {}

    const defaults = {
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

      mimeType: []
    }

    callback(err, defaults)
  })
}

/**
 * Get the hash of options for the installer.
 */
const getOptions = function (data, defaults, callback) {
  // Flatten everything for ease of use.
  const options = _.defaults({}, data, data.options, defaults)

  // Wrap the extended description to avoid rpmlint warning about
  // `description-line-too-long`.
  options.productDescription = wrap(options.productDescription, {width: 100, indent: ''})

  callback(null, options)
}

/**
 * Fill in a template with the hash of options.
 */
const generateTemplate = function (options, file, callback) {
  options.logger('Generating template from ' + file)

  async.waterfall([
    async.apply(fs.readFile, file),
    function (template, callback) {
      const result = _.template(template)(options)
      options.logger('Generated template from ' + file + '\n' + result)
      callback(null, result)
    }
  ], callback)
}

/**
 * Create the spec file for the package.
 *
 * See: https://fedoraproject.org/wiki/How_to_create_an_RPM_package
 */
const createSpec = function (options, dir, callback) {
  const specSrc = path.resolve(__dirname, '../resources/spec.ejs')
  const specDest = path.join(dir, 'SPECS', options.name + '.spec')
  options.logger('Creating spec file at ' + specDest)

  async.waterfall([
    async.apply(generateTemplate, options, specSrc),
    async.apply(fs.outputFile, specDest)
  ], function (err) {
    callback(err && new Error('Error creating spec file: ' + (err.message || err)))
  })
}

/**
 * Create the binary for the package.
 */
const createBinary = function (options, dir, callback) {
  const binDir = path.join(dir, 'BUILD/usr/bin')
  const binSrc = path.join('../lib', options.name, options.bin)
  const binDest = path.join(binDir, options.name)
  options.logger('Symlinking binary from ' + binSrc + ' to ' + binDest)

  async.waterfall([
    async.apply(fs.ensureDir, binDir),
    async.apply(fs.symlink, binSrc, binDest, 'file')
  ], function (err) {
    callback(err && new Error('Error creating binary file: ' + (err.message || err)))
  })
}

/**
 * Create the desktop file for the package.
 *
 * See: http://standards.freedesktop.org/desktop-entry-spec/latest/
 */
const createDesktop = function (options, dir, callback) {
  const desktopSrc = path.resolve(__dirname, '../resources/desktop.ejs')
  const desktopDest = path.join(dir, 'BUILD/usr/share/applications', options.name + '.desktop')
  options.logger('Creating desktop file at ' + desktopDest)

  async.waterfall([
    async.apply(generateTemplate, options, desktopSrc),
    async.apply(fs.outputFile, desktopDest)
  ], function (err) {
    callback(err && new Error('Error creating desktop file: ' + (err.message || err)))
  })
}

/**
 * Create pixmap icon for the package.
 */
const createPixmapIcon = function (options, dir, callback) {
  const iconFile = path.join(dir, 'BUILD/usr/share/pixmaps', options.name + '.png')
  options.logger('Creating icon file at ' + iconFile)

  fs.copy(options.icon, iconFile, function (err) {
    callback(err && new Error('Error creating icon file: ' + (err.message || err)))
  })
}

/**
 * Create hicolor icon for the package.
 */
const createHicolorIcon = function (options, dir, callback) {
  async.forEachOf(options.icon, function (icon, resolution, callback) {
    const iconFile = path.join(dir, 'BUILD/usr/share/icons/hicolor', resolution, 'apps', options.name + '.png')
    options.logger('Creating icon file at ' + iconFile)

    fs.copy(icon, iconFile, callback)
  }, function (err) {
    callback(err && new Error('Error creating icon file: ' + (err.message || err)))
  })
}

/**
 * Create icon for the package.
 */
const createIcon = function (options, dir, callback) {
  if (_.isObject(options.icon)) {
    createHicolorIcon(options, dir, callback)
  } else {
    createPixmapIcon(options, dir, callback)
  }
}

/**
 * Create copyright for the package.
 */
const createCopyright = function (options, dir, callback) {
  const copyrightFile = path.join(dir, 'BUILD/usr/share/doc', options.name, 'copyright')
  options.logger('Creating copyright file at ' + copyrightFile)

  async.waterfall([
    async.apply(readLicense, options),
    async.apply(fs.outputFile, copyrightFile)
  ], function (err) {
    callback(err && new Error('Error creating copyright file: ' + (err.message || err)))
  })
}

/**
 * Copy the application into the package.
 */
const createApplication = function (options, dir, callback) {
  const applicationDir = path.join(dir, 'BUILD/usr/lib', options.name)
  options.logger('Copying application to ' + applicationDir)

  async.waterfall([
    async.apply(fs.ensureDir, applicationDir),
    async.apply(fs.copy, options.src, applicationDir)
  ], function (err) {
    callback(err && new Error('Error copying application directory: ' + (err.message || err)))
  })
}

/**
 * Create temporary directory where the contents of the package will live.
 */
const createDir = function (options, callback) {
  options.logger('Creating temporary directory')

  async.waterfall([
    async.apply(temp.mkdir, 'electron-'),
    function (dir, callback) {
      dir = path.join(dir, options.name + '_' + options.version + '_' + options.arch)
      fs.ensureDir(dir, callback)
    }
  ], function (err, dir) {
    callback(err && new Error('Error creating temporary directory: ' + (err.message || err)), dir)
  })
}

/**
 * Create macros file used by `rpmbuild`.
 */
const createMacros = function (options, dir, callback) {
  const macrosSrc = path.resolve(__dirname, '../resources/macros.ejs')
  const macrosDest = path.join(process.env.HOME, '.rpmmacros')
  options.logger('Creating macros file at ' + macrosDest)

  async.waterfall([
    async.apply(generateTemplate, _.assign({dir: dir}, options), macrosSrc),
    async.apply(fs.outputFile, macrosDest)
  ], function (err) {
    callback(err && new Error('Error creating macros file: ' + (err.message || err)), dir)
  })
}

/**
 * Create the contents of the package.
 */
const createContents = function (options, dir, callback) {
  options.logger('Creating contents of package')

  async.parallel([
    async.apply(createSpec, options, dir),
    async.apply(createBinary, options, dir),
    async.apply(createDesktop, options, dir),
    async.apply(createIcon, options, dir),
    async.apply(createCopyright, options, dir),
    async.apply(createApplication, options, dir)
  ], function (err) {
    callback(err, dir)
  })
}

/**
 * Package everything using `rpmbuild`.
 */
const createPackage = function (options, dir, callback) {
  options.logger('Creating package at ' + dir)

  const specFile = path.join(dir, 'SPECS', options.name + '.spec')
  spawn(options, 'rpmbuild', ['-bb', specFile, '--target', options.arch], function (err) {
    callback(err, dir)
  })
}

/**
 * Move the package to the specified destination.
 */
const movePackage = function (options, dir, callback) {
  options.logger('Moving package to destination')

  const packagePattern = path.join(dir, 'RPMS', options.arch, '*.rpm')
  async.waterfall([
    async.apply(glob, packagePattern),
    function (files, callback) {
      async.each(files, function (file) {
        let dest = options.rename(options.dest, path.basename(file))
        dest = _.template(dest)(options)
        options.logger('Moving file ' + file + ' to ' + dest)
        fs.move(file, dest, {clobber: true}, callback)
      }, callback)
    }
  ], function (err) {
    callback(err && new Error('Error moving package files: ' + (err.message || err)), dir)
  })
}

/* ************************************************************************** */

module.exports = function (data, callback) {
  data.rename = data.rename || defaultRename
  data.logger = data.logger || defaultLogger

  async.waterfall([
    async.apply(getDefaults, data),
    async.apply(getOptions, data),
    function (options, callback) {
      let adjustedVersion = util.replaceInvalidVersionCharacters(options.version)
      if (adjustedVersion !== options.version) {
        data.logger('Warning: replacing disallowed characters in version to comply with SPEC format.' +
          `Changing ${options.version} to ${adjustedVersion}`)
        options.version = adjustedVersion
      }
      data.logger('Creating package with options\n' + JSON.stringify(options, null, 2))
      async.waterfall([
        async.apply(createDir, options),
        async.apply(createMacros, options),
        async.apply(createContents, options),
        async.apply(createPackage, options),
        async.apply(movePackage, options)
      ], function (err) {
        callback(err, options)
      })
    }
  ], function (err, options) {
    if (!err) {
      data.logger('Successfully created package at ' + options.dest)
    } else {
      data.logger('Error creating package: ' + (err.message || err))
    }

    callback(err, options)
  })
}
