'use strict';

const _ = require('lodash');

class DeployFiles {

  /**
   * @param config
   * @param services
   * @param program
   */
  constructor(config, services, program) {
    this.config = config;
    this.services = services;
    this.program = program;
    this.sets = this.config['sets']['deploy']['files'];

    this.initInterface();
  }

  initInterface() {
    this.program.command('deploy <what> <exactly> <from> <to>').
        alias('d').
        description('Deploy').
        action((what, exactly, from, to) => {
          if (what !== 'files') return;
          this.services.outputService.print(
            `deploy files (${exactly}) from ${from} to ${to}`,
              this.services.outputService.TYPE_INFO
          );
          this.services.hookService.call(`deploy.${what}.${exactly}.before`, {what, exactly, from, to});
          this.deploy(exactly, from, to);
          this.services.hookService.call(`deploy.${what}.${exactly}.after`, {what, exactly, from, to});

          this.services.outputService.hideLoading();
        });
  }

  /**
   * deploy
   *
   * @param what
   * @param from
   * @param to
   */
  deploy(what, from, to) {
    if (!this.sets.hasOwnProperty(what)) {
      this.services.outputService.print(`set (${what}) doesnt exist in configuration`);
      return;
    }

    let set = this.sets[what];

    /** check if way is allowed by config: */
    let possibleWays = set.ways;
    let way;

    for (let possibleWay of possibleWays) {
      if (possibleWay.indexOf(from) === 0 && possibleWay.indexOf(to) === 1) {
        way = possibleWay;
      }
    }

    if (!way) {
      this.services.outputService.print(
          `this way (${from} -> ${to}) is not allowed by configuration`);
      return;
    }

    let paths = set.paths;

    /** Auto backup: */
    let backupEnvironment = this.config.environments[to];
    const autoBackup = _.get(backupEnvironment, 'backup.autoBackup');
    if (autoBackup === true) {
      if (_.has(backupEnvironment, 'paths.backup')) {
        this.services.backupService.backupFiles(what, backupEnvironment, paths, true);
      }
    }

    for (let path of paths) {
      this.copy(path, from, to);
    }
  }

  /**
   * copy
   *
   * @param path
   * @param from
   * @param to
   */
  copy(path, from, to) {
    let fromEnvironment = this.config.environments[from];
    let toEnvironment = this.config.environments[to];

    if (!fromEnvironment.paths[path]) {
      this.services.outputService.print(
          `path (${path}) not defined in config for environment ${from}`, this.services.outputService.TYPE_ERROR);
      return;
    }
    let fromPath = fromEnvironment.paths[path];

    if (!toEnvironment.paths[path]) {
      this.services.outputService.print(
          `path (${path}) not defined in config for environment ${to}`, this.services.outputService.TYPE_ERROR);
      return;
    }
    let toPath = toEnvironment.paths[path];

    this.services.outputService.printWithLoading(
        `deploy ${fromPath}`
    );

    this.services.syncService.sync(fromPath, toPath, fromEnvironment, toEnvironment);

    this.services.outputService.hideLoading();
  }
}

module.exports = DeployFiles;