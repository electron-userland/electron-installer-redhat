'use strict'

const _ = require('lodash')
const common = require('electron-installer-common')
const debug = require('debug')
const fs = require('fs-extra')
const path = require('path')
const wrap = require('word-wrap')

const redhatDependencies = require('./dependencies')
const spawn = require('./spawn')
const util = require('./util')

const defaultLogger = debug('electron-installer-redhat')

const defaultRename = function (dest, src) {
  return path.join(dest, '<%= name %>-<%= version %>-<%= revision %>.<%= arch %>.rpm')
}

class RedhatInstaller extends common.ElectronInstaller {
  get baseAppDir () {
    return path.join('BUILD', 'usr')
  }

  get contentFunctions () {
    return [
      'copyApplication',
      'copyLinuxIcons',
      'createBinarySymlink',
      'createCopyright',
      'createDesktopFile',
      'createSpec'
    ]
  }

  get defaultDesktopTemplatePath () {
    return path.resolve(__dirname, '../resources/desktop.ejs')
  }

  get packagePattern () {
    return path.join(this.stagingDir, 'RPMS', this.options.arch, '*.rpm')
  }

  get specPath () {
    return path.join(this.stagingDir, 'SPECS', `${this.options.name}.spec`)
  }

  /**
   * Copy the application into the package.
   */
  copyApplication () {
    return super.copyApplication()
      .then(() => this.updateSandboxHelperPermissions())
  }

  /**
   * Creates macros file used by `rpmbuild`.
   */
  createMacros () {
    const src = path.resolve(__dirname, '../resources/macros.ejs')
    const dest = path.join(process.env.HOME, '.rpmmacros')
    this.options.logger(`Creating macros file at ${dest}`)

    return common.createTemplatedFile(src, dest, Object.assign({ dir: this.stagingDir }, this.options))
      .catch(common.wrapError('creating macros file'))
  }

  /**
   * Package everything using `rpmbuild`.
   */
  createPackage () {
    this.options.logger(`Creating package at ${this.stagingDir}`)

    return spawn('rpmbuild', ['-bb', this.specPath, '--target', this.options.arch], this.options.logger)
      .then(output => this.options.logger(`rpmbuild output: ${output}`))
  }

  /**
   * Creates the spec file for the package.
   *
   * See: https://fedoraproject.org/wiki/How_to_create_an_RPM_package
   */
  createSpec () {
    const src = path.resolve(__dirname, '../resources/spec.ejs')
    this.options.logger(`Creating spec file at ${this.specPath}`)

    return this.createTemplatedFile(src, this.specPath)
      .catch(common.wrapError('creating spec file'))
  }

  /**
   * Get the hash of default options for the installer. Some come from the info
   * read from `package.json`, and some are hardcoded.
   */
  generateDefaults () {
    return common.readElectronVersion(this.userSupplied.src)
      .then(electronVersion => Promise.all([
        common.readMetadata(this.userSupplied),
        redhatDependencies.forElectron(electronVersion, this.userSupplied.logger)
      ])).then(([pkg, requires]) => {
        pkg = pkg || {}

        this.defaults = Object.assign(common.getDefaultsFromPackageJSON(pkg), {
          version: pkg.version || '0.0.0',
          license: pkg.license,
          compressionLevel: 2,
          icon: path.resolve(__dirname, '../resources/icon.png'),

          pre: undefined,
          post: undefined,
          preun: undefined,
          postun: undefined
        }, requires)

        return this.defaults
      })
  }

  /**
   * Get the hash of options for the installer.
   */
  generateOptions () {
    super.generateOptions()

    this.options.name = common.sanitizeName(this.options.name, '-._+a-zA-Z0-9')

    if (!this.options.description && !this.options.productDescription) {
      throw new Error(`No Description or ProductDescription provided. Please set either a description in the app's package.json or provide it in the options.`)
    }

    if (this.options.description) {
      // Do not end with a period
      this.options.description = this.options.description.replace(/\.*$/, '')
    }

    // Wrap the extended description to avoid rpmlint warning about
    // `description-line-too-long`.
    this.options.productDescription = wrap(this.options.productDescription, { width: 80, indent: '' })

    // Merges user and default dependencies
    this.options.requires = common.mergeUserSpecified(this.userSupplied, 'requires', this.defaults)

    this.normalizeVersion()
  }

  /**
   * Read scripts from provided filename and add them to the options
   */
  generateScripts () {
    const scriptNames = ['pre', 'post', 'preun', 'postun']

    return Promise.all(_.map(this.options.scripts, (item, key) => {
      if (scriptNames.includes(key)) {
        this.options.logger(`Creating installation script ${key}`)
        return fs.readFile(item)
          .then(script => (this.options[key] = script.toString()))
      }
    }))
  }

  normalizeVersion () {
    const adjustedVersion = util.replaceInvalidVersionCharacters(this.options.version)
    if (adjustedVersion !== this.options.version) {
      this.options.logger('Warning: replacing disallowed characters in version to comply with SPEC format.' +
        `Changing ${this.options.version} to ${adjustedVersion}`)
      this.options.version = adjustedVersion
    }
  }
}

/* ************************************************************************** */

module.exports = data => {
  data.rename = data.rename || defaultRename
  data.logger = data.logger || defaultLogger

  const installer = new RedhatInstaller(data)

  return installer.generateDefaults()
    .then(() => installer.generateOptions())
    .then(() => installer.generateScripts())
    .then(() => data.logger(`Creating package with options\n${JSON.stringify(installer.options, null, 2)}`))
    .then(() => installer.createStagingDir())
    .then(() => installer.createMacros())
    .then(() => installer.createContents())
    .then(() => installer.createPackage())
    .then(() => installer.movePackage())
    .then(() => {
      data.logger(`Successfully created package at ${installer.options.dest}`)
      return installer.options
    }).catch(err => {
      data.logger(common.errorMessage('creating package', err))
      throw err
    })
}

module.exports.Installer = RedhatInstaller
