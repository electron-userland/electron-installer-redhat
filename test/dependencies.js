const dependencies = require('../src/dependencies')
const chai = require('chai')
const sinon = require('sinon')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
const { expect } = chai
chai.should()

describe('dependencies', () => {
  describe('forElectron', () => {
    afterEach(() => {
      sinon.restore()
    })

    it('uses an RPM that does not support boolean dependencies', async () => {
      sinon.stub(dependencies, 'rpmSupportsBooleanDependencies').resolves(false)
      dependencies.forElectron('v1.0.0').should.be.rejectedWith(/^Please upgrade to RPM 4\.13/)
    })

    it('uses an RPM that supports boolean dependencies', async () => {
      sinon.stub(dependencies, 'rpmSupportsBooleanDependencies').resolves(true)
      dependencies.forElectron('v1.0.0').should.be.fulfilled // eslint-disable-line no-unused-expressions
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
