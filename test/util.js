const expect = require('chai').expect
const util = require('../src/util.js')

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

  describe('replaceInvalidVersionCharacters', function (test) {
    [{
      input: '1.2.3',
      expectedOutput: '1.2.3'
    }, {
      input: '1.0.0-beta',
      expectedOutput: '1.0.0.beta'
    }, {
      input: '1.0.0-multiple-hyphens',
      expectedOutput: '1.0.0.multiple.hyphens'
    }, {
      input: '1.0.0-beta+exp.sha.5114f85',
      expectedOutput: '1.0.0.beta+exp.sha.5114f85'
    }, {
      input: undefined,
      expectedOutput: ''
    }].forEach(function (scenario) {
      it(`${JSON.stringify(scenario.input)} -> ${JSON.stringify(scenario.expectedOutput)}`, function () {
        expect(util.replaceInvalidVersionCharacters(scenario.input)).to.equal(scenario.expectedOutput)
      })
    })
  })
})
