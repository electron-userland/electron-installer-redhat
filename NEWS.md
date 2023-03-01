# `electron-installer-redhat` - Changes by Version

## [Unreleased]

[Unreleased]: https://github.com/electron-userland/electron-installer-redhat/compare/v3.4.0...main

## [3.4.0] - 2023-02-28

[3.4.0]: https://github.com/electron-userland/electron-installer-redhat/compare/v3.3.0...v3.4.0

### Added

* Add options.platform to set %_target_os (#175, #196)

### Fixed

* Skip stripping when making RPM for different architecture (#325)

## [3.3.0] - 2021-02-05

[3.3.0]: https://github.com/electron-userland/electron-installer-redhat/compare/v3.2.0...v3.3.0

### Added

* Support for OpenSuse Leap dependencies (#182)

## [3.2.0] - 2020-07-23

[3.2.0]: https://github.com/electron-userland/electron-installer-redhat/compare/v3.1.0...v3.2.0

### Added

* Support for scalable and symbolic icons (#169)

### Fixed

* Conformance to [RPM spec formatting guidelines](https://fedoraproject.org/wiki/PeterGordon/SpecFormattingGuidelines) (#171)

## [3.1.0] - 2020-06-28

[3.1.0]: https://github.com/electron-userland/electron-installer-redhat/compare/v3.0.0...v3.1.0

### Added

* Dependencies for Electron >= 9 (#156)

### Fixed

* Stop overwriting `~/.rpmmacros` (#160)
* Handle parsing versions from RPM >= 4.15 (#162)
* Define array options for CLI (#166)

## [3.0.0] - 2020-01-22

[3.0.0]: https://github.com/electron-userland/electron-installer-redhat/compare/v2.0.0...v3.0.0

### Added

* Electron 8 dependency compatibility (electron-userland/electron-installer-common#45)

### Removed

* Node &lt; 10 support (#151)

## [2.0.0] - 2019-06-11

[2.0.0]: https://github.com/electron-userland/electron-installer-redhat/compare/v1.1.0...v2.0.0

### Added

* ATSPI dependency for Electron >= 5 (#126)

### Fixed

* Always add revision/release to the RPM filename (#114)
* Include SVG files into the spec file (#125)

### Removed

* Node-style callback support (use [`util.callbackify`](https://nodejs.org/api/util.html#util_util_callbackify_original)
  if you need that functionality)
* Node &lt; 8 support (#121)

## [1.1.0] - 2019-05-01

[1.1.0]: https://github.com/electron-userland/electron-installer-redhat/compare/v1.0.1...v1.1.0

### Added

* Support for SUID sandbox helper in Electron >= 5 (#112)

## [1.0.1] - 2019-02-20

[1.0.1]: https://github.com/electron-userland/electron-installer-redhat/compare/v1.0.0...v1.0.1

### Changed

* Upgrade to `electron-installer-common@^0.6.1` (#104)

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
