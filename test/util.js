const { expect } = require('chai')
const { replaceInvalidVersionCharacters } = require('../src/util')

describe('private utility functions', function () {
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
    }].forEach(scenario => {
      it(`${JSON.stringify(scenario.input)} -> ${JSON.stringify(scenario.expectedOutput)}`, () => {
        expect(replaceInvalidVersionCharacters(scenario.input)).to.equal(scenario.expectedOutput)
      })
    })
  })
})
