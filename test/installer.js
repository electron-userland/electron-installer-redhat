'use strict'

var installer = require('..')

var fs = require('fs-extra')
var os = require('os')
var path = require('path')
var access = require('./helpers/access')

describe('module', function () {
  this.timeout(10000)

  describe('with an app with asar', function (test) {
    var dest = 'test/fixtures/out/foo/'

    before(function (done) {
      installer({
        src: 'test/fixtures/app-with-asar/',
        dest: dest,
        rename: function (dest) {
          return path.join(dest, '<%= name %>.<%= arch %>.rpm')
        },

        options: {
          productDescription: 'Just a test.',
          arch: 'x86'
        }
      }, done)
    })

    after(function (done) {
      fs.remove(dest, done)
    })

    it('generates a `.rpm` package', function (done) {
      access(dest + 'footest.x86.rpm', done)
    })
  })

  describe('with an app without asar', function (test) {
    var dest = 'test/fixtures/out/bar/'

    before(function (done) {
      installer({
        src: 'test/fixtures/app-without-asar/',
        dest: dest,
        rename: function (dest) {
          return path.join(dest, '<%= name %>.<%= arch %>.rpm')
        },

        options: {
          icon: {
            '1024x1024': 'test/fixtures/icon.png'
          },
          bin: 'resources/cli/bar.sh',
          productDescription: 'Just a test.',
          arch: 'x86_64',
          categories: [
            'Utility'
          ],
          mimeType: [
            'text/plain'
          ]
        }
      }, done)
    })
  })

  describe('with an app without a homepage or author URL', function (test) {
    var baseDir = path.join(os.tmpdir(), 'electron-installer-redhat', 'app-without-homepage')
    var dest = 'test/fixtures/out/baz/'

    before(function (done) {
      if (fs.existsSync(baseDir)) {
        fs.removeSync(baseDir)
      }
      fs.copySync('test/fixtures/app-without-asar', baseDir)
      var packageJSONFilename = path.join(baseDir, 'resources', 'app', 'package.json')
      var packageJSON = JSON.parse(fs.readFileSync(packageJSONFilename))
      packageJSON.author = 'Test Author'
      fs.writeFileSync(packageJSONFilename, JSON.stringify(packageJSON))
      installer({
        src: baseDir,
        dest: dest,
        rename: function (dest) {
          return path.join(dest, '<%= name %>.<%= arch %>.rpm')
        },

        options: {
          arch: 'x86_64'
        }
      }, done)
    })

    after(function (done) {
      fs.removeSync(baseDir)
      fs.remove(dest, done)
    })

    it('generates a `.rpm` package', function (done) {
      access(dest + 'bartest.x86_64.rpm', done)
    })
  })

  describe('with an app having hyphens in its version string', function (test) {
    var baseDir = path.join(os.tmpdir(), 'electron-installer-redhat', 'app-with-hyphen')
    var dest = 'test/fixtures/out/baz/'

    before(function (done) {
      if (fs.existsSync(baseDir)) {
        fs.removeSync(baseDir)
      }
      fs.copySync('test/fixtures/app-without-asar', baseDir)
      var packageJSONFilename = path.join(baseDir, 'resources', 'app', 'package.json')
      var packageJSON = JSON.parse(fs.readFileSync(packageJSONFilename))
      packageJSON.version = '1.0.0-beta+internal-only.0'
      fs.writeFileSync(packageJSONFilename, JSON.stringify(packageJSON))
      installer({
        src: baseDir,
        dest: dest,
        rename: function (dest) {
          return path.join(dest, '<%= name %>.<%= arch %>.rpm')
        },

        options: {
          arch: 'x86_64'
        }
      }, done)
    })

    after(function (done) {
      fs.removeSync(baseDir)
      fs.remove(dest, done)
    })

    it('generates a `.rpm` package', function (done) {
      access(dest + 'bartest.x86_64.rpm', done)
    })
  })
})
