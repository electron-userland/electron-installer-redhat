'use strict'

var fs = require('fs-extra')
var access = require('./helpers/access')
var spawn = require('./helpers/spawn')

describe('cli', function () {
  this.timeout(10000)

  describe('with an app with asar', function (test) {
    var dest = 'test/fixtures/out/foo/'

    before(function (done) {
      spawn('./src/cli.js', [
        '--src', 'test/fixtures/app-with-asar/',
        '--dest', dest,
        '--arch', 'x86'
      ], done)
    })

    after(function (done) {
      fs.remove(dest, done)
    })

    it('generates a `.rpm` package', function (done) {
      access(dest + 'footest-0.0.1.x86.rpm', done)
    })
  })

  describe('with an app without asar', function (test) {
    var dest = 'test/fixtures/out/bar/'

    before(function (done) {
      spawn('node src/cli.js', [
        '--src', 'test/fixtures/app-without-asar/',
        '--dest', dest,
        '--arch', 'x86_64'
      ], done)
    })

    after(function (done) {
      fs.remove(dest, done)
    })

    it('generates a `.rpm` package', function (done) {
      access(dest + 'bartest-0.0.1.x86_64.rpm', done)
    })
  })
})
