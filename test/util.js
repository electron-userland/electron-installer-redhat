const { expect } = require('chai')
const {
  replaceInvalidVersionCharacters,
  mergeDependencies
} = require('../src/util')

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

  describe('merge dependencies', () => {
    // TODO: Replace this with electron-installer-common.dependencies
    const defaults = {
      requires: ['lsb', 'libXScrnSaver']
    }
    const userDependencies = ['dbus', 'dbus', 'lsb']

    const expectedOutput = ['dbus', 'libXScrnSaver', 'lsb']

    it(`options passed programmatically`, () => {
      const data = {
        options: { requires: userDependencies }
      }
      expect(mergeDependencies(data, defaults).sort()).to.deep.equal(expectedOutput)
    })

    it(`options passed via command-line`, () => {
      const data = { requires: userDependencies }
      expect(mergeDependencies(data, defaults).sort()).to.deep.equal(expectedOutput)
    })
  })
})
