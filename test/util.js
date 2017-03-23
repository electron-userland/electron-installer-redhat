var expect = require('chai').expect
var util = require('../src/util.js')

describe('private utility functions', function () {
  this.timeout(10000)

  describe('getHomepage', function (test) {
    [{
      name: 'Return empty string if none available',
      pkg: {},
      expectedHomepage: ''
    }, {
      name: 'Use homepage property if present',
      pkg: {
        homepage: 'http://example.com/homepage-property',
        author: 'First Last <first.last@example.com> (http://www.example.com/author-string)'
      },
      expectedHomepage: 'http://example.com/homepage-property'
    }, {
      name: 'Use URL from author string if no homepage',
      pkg: {
        author: 'First Last <first.last@example.com> (http://www.example.com/author-string)'
      },
      expectedHomepage: 'http://www.example.com/author-string'
    }, {
      name: 'Use URL from author object if no homepage',
      pkg: {
        author: {
          url: 'http://www.example.com/author-object-url'
        }
      },
      expectedHomepage: 'http://www.example.com/author-object-url'
    }].forEach(function (scenario) {
      it(scenario.name, function () {
        expect(util.getHomePage(scenario.pkg)).to.equal(scenario.expectedHomepage)
      })
    })
  })
})
