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
  async copyApplication () {
    await super.copyApplication()
    return this.updateSandboxHelperPermissions()
  }

  /**
   * Package everything using `rpmbuild`.
   */
  async createPackage () {
    this.options.logger(`Creating package at ${this.stagingDir}`)

    const output = await spawn('rpmbuild', ['-bb', this.specPath, '--target', `${this.options.arch}-${this.options.vendor}-${this.options.platform}`, '--define', `_topdir ${this.stagingDir}`], this.options.logger)
    this.options.logger(`rpmbuild output: ${output}`)
  }

  /**
   * Creates the spec file for the package.
   *
   * See: https://fedoraproject.org/wiki/How_to_create_an_RPM_package
   */
  async createSpec () {
    const src = path.resolve(__dirname, '../resources/spec.ejs')
    this.options.logger(`Creating spec file at ${this.specPath}`)

    return common.wrapError('creating spec file', async () => this.createTemplatedFile(src, this.specPath))
  }

  /**
   * Get the hash of default options for the installer. Some come from the info
   * read from `package.json`, and some are hardcoded.
   */
  async generateDefaults () {
    const electronVersion = await common.readElectronVersion(this.userSupplied.src)
    const [pkg, requires] = await Promise.all([
      (async () => (await common.readMetadata(this.userSupplied)) || {})(),
      redhatDependencies.forElectron(electronVersion, this.userSupplied.logger)
    ])
    this.defaults = {
      ...common.getDefaultsFromPackageJSON(pkg, { revision: 1 }),
      version: pkg.version || '0.0.0',
      license: pkg.license,
      compressionLevel: 2,
      icon: path.resolve(__dirname, '../resources/icon.png'),
      pre: undefined,
      post: undefined,
      preun: undefined,
      postun: undefined,
      ...requires
    }

    return this.defaults
  }

  /**
   * Get the hash of options for the installer.
   */
  generateOptions () {
    super.generateOptions()

    this.options.name = common.sanitizeName(this.options.name, '-._+a-zA-Z0-9')

    if (!this.options.description && !this.options.productDescription) {
      throw new Error("No Description or ProductDescription provided. Please set either a description in the app's package.json or provide it in the options.")
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

    this.options.vendor = 'none'
    this.options.platform = this.options.platform || process.platform
  }

  /**
   * Read scripts from provided filename and add them to the options
   */
  async generateScripts () {
    const scriptNames = ['pre', 'post', 'preun', 'postun']

    return Promise.all(_.map(this.options.scripts, async (item, key) => {
      if (scriptNames.includes(key)) {
        this.options.logger(`Creating installation script ${key}`)
        this.options[key] = (await fs.readFile(item)).toString()
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

module.exports = async data => {
  data.rename = data.rename || defaultRename
  data.logger = data.logger || defaultLogger

  const installer = new RedhatInstaller(data)

  await installer.generateDefaults()
  await installer.generateOptions()
  await installer.generateScripts()
  await data.logger(`Creating package with options\n${JSON.stringify(installer.options, null, 2)}`)
  await installer.createStagingDir()
  await installer.createContents()
  await installer.createPackage()
  await installer.movePackage()
  data.logger(`Successfully created package at ${installer.options.dest}`)
  return installer.options
}

module.exports.Installer = RedhatInstaller
