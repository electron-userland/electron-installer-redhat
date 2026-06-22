import assert from 'node:assert'

import { expect } from 'chai'
import sinon from 'sinon'

import dependencies from '../src/dependencies.js'

describe('dependencies', () => {
  describe('forElectron', () => {
    afterEach(() => {
      sinon.restore()
    })

    it('uses an RPM that does not support boolean dependencies', async () => {
      sinon.stub(dependencies, 'rpmSupportsBooleanDependencies').resolves(false)
      await assert.rejects(dependencies.forElectron('v1.0.0'), /^Error: Please upgrade to RPM 4\.13/)
    })

    it('uses an RPM that supports boolean dependencies', async () => {
      sinon.stub(dependencies, 'rpmSupportsBooleanDependencies').resolves(true)
      await assert.doesNotReject(dependencies.forElectron('v1.0.0'))
    })
  })

  describe('getRpmVersion', () => {
    it('returns the version of the installed rpmbuild', async () => {
      expect(await dependencies.getRpmVersion(null)).to.match(/^\d+(\.\d+)+/)
    })
  })

  describe('parseRpmVersionOutput', () => {
    it('parses version output from RPM < 4.15', () => {
      expect(dependencies.parseRpmVersionOutput('RPM version 4.14.2.1\n')).to.equal('4.14.2.1')
    })

    it('parses version output from RPM >= 4.15', () => {
      expect(dependencies.parseRpmVersionOutput('RPM-Version 4.15.1\n')).to.equal('4.15.1')
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
