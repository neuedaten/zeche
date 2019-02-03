'use strict';

class Backup {

  /**
   * @param config
   * @param services
   * @param program
   */
  constructor(config, services, program) {
    this.config = config;
    this.services = services;
    this.program = program;
    this.sets = this.config['sets']['backup']['files'];

    this.initInterface();
  }

  initInterface() {
    this.program.command('backup <what> <exactly> <where>').
        alias('b').
        description('Backup').
        action((what, exactly, where) => {

          this.services.hookService.call(`backup.${what}.${exactly}.before`, {what, exactly, where});

          switch(what) {
            case 'list':
              break;

            case 'files':
              this.services.outputService.print(
                  `backup files (${exactly}) on ${where}`,
                  this.services.outputService.TYPE_INFO
              );
              this.backupFiles(exactly, where);
              break;

            case 'db':
              break;

            default:
              return;
          }

          this.services.hookService.call(`backup.${what}.${exactly}.after`, {what, exactly, where});
          this.services.outputService.hideLoading();
        });
  }

  /**
   * deploy
   *
   * @param what
   * @param where
   */
  backupFiles(what, where) {
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

module.exports = Backup;