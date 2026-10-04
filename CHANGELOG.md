# Changelog

All notable changes to zeche are documented here. Versions follow [semver](https://semver.org).

## 0.3.0 – 2026-10-04

### Added

- `rsyncParameters` per environment (`environments.<env>.rsyncParameters`, string or array).
  Replaces the default rsync flags `-r --links` completely when files are copied **to** that
  environment (deploy, restore) or **from** it (backup from a server). Without the key every
  rsync call is exactly the same as in 0.2.0. This is a new key on purpose: the old
  `ssh.rsyncParams` was never read by zeche, and existing configurations contain values there
  that were never meant to take effect. They still do not.
- `zeche.config.cjs` is loaded before `zeche.config.js`. In a project with `"type": "module"`
  in its package.json (Vite, …) a `.js` file is an ES module and `module.exports` arrives empty.
  An ESM `default` export is unwrapped as well. An error inside the config file (e.g. a module
  it requires is missing) is reported as such and stops zeche; it does not fall back to the
  other file.
- Tests for the rsync commands and the config loading (`npm test`, node:test, no dependencies).

### Changed

- README: section on rsync parameters, note on `.cjs`, example for the `before`/`after` hooks
  of a file deployment and their signature `(config, services, {what, exactly, from, to})`.
- package.json: `files` whitelist, so the published package contains only `bin`, `lib`,
  `index.js`, `index-sync.js`, README, license and package.json.

## 0.2.0 – 2026-01-23

### Changed

- `zeche ssh init <environment>` generates Ed25519 keys instead of RSA.
- Updated lodash.
