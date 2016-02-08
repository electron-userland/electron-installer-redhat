'use strict'

var installer = require('..')

var path = require('path')
var rimraf = require('rimraf')
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
      rimraf(dest, done)
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
          ]
        }
      }, done)
    })

    after(function (done) {
      rimraf(dest, done)
    })

    it('generates a `.rpm` package', function (done) {
      access(dest + 'bartest.x86_64.rpm', done)
    })
  })
})
