/**
 * Returns a string containing only characters that are allowed in the version field of RPM spec files
 */
export function replaceInvalidVersionCharacters (version) {
  version = version || ''
  return version.replace(/[-]/g, '.')
}
