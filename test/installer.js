'use strict'

var installer = require('..')

var fs = require('fs')
var path = require('path')

describe('module', function () {
  this.timeout(10000)

  describe('with an app with asar', function (test) {
    before(function (done) {
      installer({
        src: 'test/fixtures/app-with-asar/',
        dest: 'test/fixtures/out/',
        rename: function (dest) {
          return path.join(dest, '<%= name %>.<%= arch %>.rpm')
        },

        options: {
          productDescription: 'Just a test.',
          arch: 'x86'
        }
      }, done)
    })

    it('generates a `.rpm` package', function (done) {
      fs.access('test/fixtures/out/footest.x86.rpm', done)
    })
  })

  describe('with an app without asar', function (test) {
    before(function (done) {
      installer({
        src: 'test/fixtures/app-without-asar/',
        dest: 'test/fixtures/out/',
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

    it('generates a `.rpm` package', function (done) {
      fs.access('test/fixtures/out/bartest.x86_64.rpm', done)
    })
  })
})
