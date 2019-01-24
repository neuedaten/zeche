'use strict';

const moment = require('moment');
const TMP_DIR = '/tmp/zechetmp';

class DeployDatabase {

  /**
   * @param config
   * @param services
   * @param program
   */
  constructor(config, services, program) {
    this.config = config;
    this.services = services;
    this.program = program;
    this.sets = this.config['sets']['deploy']['db'];

    this.initInterface();
  }

  initInterface() {
    this.program.command('deploy <what> <exactly> <from> <to>').
        alias('d').
        description('Deploy').
        action((what, exactly, from, to) => {
          if (what !== 'db') return;

          this.services.outputService.printWithLoading(
              `deploy database (${exactly}) from ${from} to ${to}`);

          this.services.hookService.call(`deploy.${what}.${exactly}.before`,
              {what, exactly, from, to});


          this.deploy(exactly, from, to);

          this.services.outputService.hideLoading();

          this.services.hookService.call(`deploy.${what}.${exactly}.after`,
              {what, exactly, from, to});
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
      this.services.outputService.print(
          `set (${what}) does not exist in configuration`,
          this.services.outputService.TYPE_ERROR);
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
          `this way (${from} -> ${to}) is not allowed by configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    const fromEnvironment = this.config.environments[from];
    const toEnvironment = this.config.environments[to];

    const filename = `${TMP_DIR}/${fromEnvironment.db.database}__${moment().
        format('YYYY_MM_DD_HH_mm_ss')}.sql`;

    /** 1. Export dump on source environment: */
    let exportCommands = [
      `mysqldump --opt -h ${fromEnvironment.db.host} -P ${fromEnvironment.db.port} -u ${fromEnvironment.db.user} -p${fromEnvironment.db.password} ${fromEnvironment.db.database} > ${filename}`,
    ];

    /** Container exec for docker/vagrant: */
    if (fromEnvironment.db.container_exec) {
      exportCommands = exportCommands.map(command => {
        return `${fromEnvironment.db.container_exec} ${command}`;
      });
    }

    /** Create tmp dir: */
    exportCommands.unshift(`mkdir -p ${TMP_DIR}`);

    if (this.services.sshService.useSsh(fromEnvironment)) {
      exportCommands = exportCommands.map(command => {
        return this.services.sshService.wrapCommand(command, fromEnvironment);
      });
    }

    this.services.execService.exec(exportCommands);

    /** 2. Copy dump to target environment: */
    this.services.syncService.sync(filename, filename, fromEnvironment,
        toEnvironment);

    /** 3. Import dump on target environment: */
    let importCommands = [
      `mysql -h ${toEnvironment.db.host} -P ${toEnvironment.db.port} -u ${toEnvironment.db.user} -p${toEnvironment.db.password} ${toEnvironment.db.database} < ${filename}`,
    ];

    /** Container exec for docker/vagrant: */
    if (toEnvironment.db.container_exec) {
      importCommands = importCommands.map(command => {
        return `${toEnvironment.db.container_exec} ${command}`;
      });
    }

    if (this.services.sshService.useSsh(toEnvironment)) {
      importCommands = importCommands.map(command => {
        return this.services.sshService.wrapCommand(command, toEnvironment);
      });
    }
    this.services.execService.exec(importCommands);

    /** Remove dump on export environment: */
    let cleanUpExportCommands = [`rm ${filename}`];
    if (this.services.sshService.useSsh(fromEnvironment)) {
      cleanUpExportCommands = cleanUpExportCommands.map(command => {
        return this.services.sshService.wrapCommand(command, fromEnvironment);
      });
    }
    this.services.execService.exec(cleanUpExportCommands);

    /** Remove dump on import environment: */
    let cleanUpImportCommands = [`rm ${filename}`];
    if (this.services.sshService.useSsh(toEnvironment)) {
      cleanUpImportCommands = cleanUpImportCommands.map(command => {
        return this.services.sshService.wrapCommand(command, toEnvironment);
      });
    }
    this.services.execService.exec(cleanUpImportCommands);
  }

}

module.exports = DeployDatabase;