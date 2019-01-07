# Changes by Version

## [Unreleased]

[Unreleased]: https://github.com/electron-userland/electron-installer-redhat/compare/v1.0.0...master

## [1.0.0] - 2019-01-07

[1.0.0]: https://github.com/electron-userland/electron-installer-redhat/compare/v0.5.0...v1.0.0

### Added

* Promises support (#86)
* Custom installation scripts (#90)
* The ability to specify a custom `.desktop` file template (#91)
* Sanitize summary and description values (#97)
* Merge user dependencies with Electron dependencies (#98, #99)
* Sanitize package names to conform to Fedora policy (#101)

### Changed

* Install apps to `/usr/lib` instead of `/usr/share` (#77)
* RPMs no longer run `update-desktop-database` by default (#90)


### Removed

* Node < 6 support (#94)
* Deprecated `group` option (#97)

----

For versions prior to 1.0.0, please see `git log`.
