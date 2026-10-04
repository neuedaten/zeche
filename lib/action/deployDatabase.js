'use strict';

const _ = require('lodash');
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

    // Database work may use its own login (db.ssh); file deployments keep using ssh.
    const fromEnvironment = this.services.sshService.forDatabase(this.config.environments[from]);
    const toEnvironment = this.services.sshService.forDatabase(this.config.environments[to]);


    /** Auto backup: */
    let backupEnvironment = toEnvironment;
    const autoBackup = _.get(backupEnvironment, 'backup.autoBackup');
    if (autoBackup === true) {
      if (_.has(backupEnvironment, 'paths.backup')) {
        this.services.backupService.backupDatabase(what, backupEnvironment, true);
      }
    }

    let tmpDirFrom = TMP_DIR;
    if (fromEnvironment.paths.tmpDir) {
      tmpDirFrom = fromEnvironment.paths.tmpDir;
    }

    let tmpDirTo = TMP_DIR;
    if (toEnvironment.paths.tmpDir) {
      tmpDirTo = toEnvironment.paths.tmpDir;
    }

    const filenameFrom = `${tmpDirFrom}/${fromEnvironment.db.database}__${moment().
        format('YYYY_MM_DD_HH_mm_ss')}.sql`;

    const filenameTo = `${tmpDirTo}/${fromEnvironment.db.database}__${moment().
        format('YYYY_MM_DD_HH_mm_ss')}.sql`;

    /** 1. Export dump on source environment: */
    let exportCommands = [
      `${this.services.sshService.dbTool(fromEnvironment, 'dump')} --opt ${this.services.sshService.dbConnection(fromEnvironment)} -u ${fromEnvironment.db.user} -p'${fromEnvironment.db.password}' ${fromEnvironment.db.database} > ${filenameFrom}`,
    ];

    /** Container exec for docker/vagrant: */
    if (fromEnvironment.db.container_exec) {
      exportCommands = exportCommands.map(command => {
        return `${fromEnvironment.db.container_exec} ${command}`;
      });
    }

    /** Create tmp dir: */
    exportCommands.unshift(`mkdir -p ${tmpDirFrom}`);

    if (this.services.sshService.useSsh(fromEnvironment)) {
      exportCommands = exportCommands.map(command => {
        return this.services.sshService.wrapCommand(command, fromEnvironment);
      });
    }

    this.services.execService.exec(exportCommands);

    /** 2. Copy dump to target environment: */
    // The dump is a single file: copy it with rsync's defaults, not with the rsyncParameters
    // meant for the project tree (--delete, --exclude …).
    const plain = (e) => Object.assign({}, e, { rsyncParameters: undefined });
    this.services.syncService.sync(filenameFrom, filenameTo, plain(fromEnvironment), plain(toEnvironment));

    /** 3. Import dump on target environment: */
    let importCommands = [
      `${this.services.sshService.dbTool(toEnvironment, 'client')} ${this.services.sshService.dbConnection(toEnvironment)} -u ${toEnvironment.db.user} -p'${toEnvironment.db.password}' ${toEnvironment.db.database} < ${filenameTo}`,
    ];

    /** Container exec for docker/vagrant: */
    if (toEnvironment.db.container_exec) {
      importCommands = importCommands.map(command => {
        return `${toEnvironment.db.container_exec} ${command}`;
      });
    }

    /** Create tmp dir to: */
    importCommands.unshift(`mkdir -p ${tmpDirTo}`);

    if (this.services.sshService.useSsh(toEnvironment)) {
      importCommands = importCommands.map(command => {
        return this.services.sshService.wrapCommand(command, toEnvironment);
      });
    }
    this.services.execService.exec(importCommands);

    /** Remove dump on export environment: */
    let cleanUpExportCommands = [`rm ${filenameFrom}`];
    if (this.services.sshService.useSsh(fromEnvironment)) {
      cleanUpExportCommands = cleanUpExportCommands.map(command => {
        return this.services.sshService.wrapCommand(command, fromEnvironment);
      });
    }
    this.services.execService.exec(cleanUpExportCommands);

    /** Remove dump on import environment: */
    let cleanUpImportCommands = [`rm ${filenameTo}`];
    if (this.services.sshService.useSsh(toEnvironment)) {
      cleanUpImportCommands = cleanUpImportCommands.map(command => {
        return this.services.sshService.wrapCommand(command, toEnvironment);
      });
    }
    this.services.execService.exec(cleanUpImportCommands);
  }

}

module.exports = DeployDatabase;
