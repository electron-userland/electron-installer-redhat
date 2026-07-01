import { after, before, describe, it } from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'

import access from './helpers/access.js'
import { cleanupOutputDir, tempOutputDir } from './helpers/describe_installer.js'
import spawn from '../src/spawn.js'

function runCLI (options) {
  const args = [
    '--src', options.src,
    '--dest', options.dest,
    '--arch', options.arch
  ]
  if (options.config) args.push('--config', options.config)

  before(() => spawn('./src/cli.js', args))
}

describe('cli', () => {

  describe('with an app with asar', () => {
    const outputDir = tempOutputDir()

    runCLI({ src: 'test/fixtures/app-with-asar/', dest: outputDir, arch: 'x86' })

    it('generates a `.rpm` package', () => access(path.join(outputDir, 'footest-0.0.1-1.x86.rpm')))

    cleanupOutputDir(outputDir)
  })

  describe('with an app without asar', () => {
    const outputDir = tempOutputDir()

    runCLI({ src: 'test/fixtures/app-without-asar/', dest: outputDir, arch: 'x86_64' })

    it('generates a `.rpm` package', () => access(path.join(outputDir, 'bartest-0.0.1-1.x86_64.rpm')))

    after(() => fs.rm(outputDir, { recursive: true, force: true }))
  })
})
