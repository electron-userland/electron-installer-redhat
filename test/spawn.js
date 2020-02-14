'use strict'

const chai = require('chai')
const spawn = require('../src/spawn')

describe('spawn', () => {
  let oldPath

  before(() => {
    oldPath = process.env.PATH
    process.env.PATH = '/non-existent-path'
  })

  it('should throw a human-friendly error when it cannot find rpmbuild', async () => {
    try {
      await spawn('rpmbuild', ['--version'], msg => { })
      throw new Error('rpmbuild should not have been executed')
    } catch (error) {
      chai.expect(error.message).to.match(/Error executing command \(rpmbuild --version\):\nYour system is missing the rpm/)
    }
  })

  after(() => {
    process.env.PATH = oldPath
  })
})
