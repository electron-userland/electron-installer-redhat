const dependencies = require('../src/dependencies')
const { expect } = require('chai')
const sinon = require('sinon')

describe('dependencies', () => {
  describe('forElectron', () => {
    afterEach(() => {
      sinon.restore()
    })

    it('uses an RPM that does not support boolean dependencies', async () => {
      sinon.stub(dependencies, 'rpmSupportsBooleanDependencies').resolves(false)
      try {
        await dependencies.forElectron('v1.0.0')
      } catch (error) {
        expect(error.message).to.match(/^You are using RPM < 4.13/)
      }
    })

    it('uses an RPM that supports boolean dependencies', async () => {
      sinon.stub(dependencies, 'rpmSupportsBooleanDependencies').resolves(true)
      try {
        expect(await dependencies.forElectron('v1.0.0')).to.have.property('requires')
      } catch (error) {
        return expect(error).to.be.undefined
      }
    })
  })

  describe('rpmVersionSupportsBooleanDependencies', () => {
    it('works with release candidates', () => {
      expect(dependencies.rpmVersionSupportsBooleanDependencies('4.13.0-rc1')).to.equal(true)
    })

    it('works with git snapshots', () => {
      expect(dependencies.rpmVersionSupportsBooleanDependencies('4.11.90-git12844')).to.equal(false)
    })

    it('works with 4 part versions (1.2.3.4)', () => {
      expect(dependencies.rpmVersionSupportsBooleanDependencies('4.1.12.2')).to.equal(false)
    })
  })

  describe('trashRequiresAsBoolean', () => {
    it('does not use parentheses for one item', () => {
      const trashDeps = dependencies.trashRequiresAsBoolean('1.0.0', dependencies.dependencyMap)[0]
      expect(trashDeps[0]).to.not.match(/^\(/)
    })

    it('ORs more than one item', () => {
      const trashDeps = dependencies.trashRequiresAsBoolean('1.5.0', dependencies.dependencyMap)[0]
      expect(trashDeps).to.match(/^\(.* or .*\)$/)
    })
  })
})
