import { spawn as crossSpawn } from '@malept/cross-spawn-promise'
import which from 'which'

function updateExecutableMissingException (err, updateError) {
  if (updateError && err.code === 'ENOENT' && err.syscall === 'spawn rpmbuild') {
    let installer
    let pkg = 'rpm'

    if (process.platform === 'darwin') {
      installer = 'brew'
    } else if (which.sync('dnf', { nothrow: true })) {
      installer = 'dnf'
      pkg = 'rpm-build'
    } else { // assume apt-based Linux distro
      installer = 'apt'
    }

    err.message = `Your system is missing the ${pkg} package. Try, e.g. '${installer} install ${pkg}'`
  }
}

export default function spawn (cmd, args, logger) {
  return crossSpawn(cmd, args, {
    logger,
    updateErrorCallback: updateExecutableMissingException
  })
}
