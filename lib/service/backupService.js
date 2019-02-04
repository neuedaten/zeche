'use strict';

const _ = require('lodash');
const crypto = require('crypto');
const moment = require('moment');
const chalk = require('chalk');
const Table = require('cli-table');

class BackupService {

  constructor(services) {
    this.services = services;
  }

  showList(environment) {
    let configFileContent = this.readConfigFile(environment);

    const table = new Table({
      head: [chalk.blue('id'), chalk.blue('what'), chalk.blue(' date')]
      , colWidths: [10, 25, 25]
    });

    let id = 0;

    for (let backup of configFileContent.backups) {
      table.push([id, backup.what, backup.dateTime]);
      id += 1;
    }

    this.services.outputService.print(chalk.blue.bold(`backups on ${environment.name}:`));
    this.services.outputService.print(table.toString());
    this.services.outputService.print(chalk.blue(`Rollback:`) + chalk.gray(` zeche backup rollback <environment> <id>`));
  }

  /**
   * backupFiles
   *
   * @param what
   * @param environment
   */
  backupFiles(what, environment, paths) {

    let pathPrefix = this.getTmpHash(moment().format());

    let backupConfig = {
      what: what,
      where: environment.name,
      dateTime: moment().format('DD.MM.YYYY HH:mm:ss'),
      pathPrefix: pathPrefix,
      paths: []
    };

    for (let path of paths) {
      let backupPath = this.copyPath(pathPrefix, path, environment);
      backupConfig.paths.push({path: path, backupPath: backupPath});
    }

    let configFileContent = this.readConfigFile(environment);
    configFileContent.backups.push(backupConfig);
    this.writeConfigFile(environment, configFileContent);

  }

  /**
   * copyPath
   *
   * @param pathPrefix
   * @param path
   * @param environment
   */
  copyPath(pathPrefix, path, environment) {

    if (!environment.paths[path]) {
      this.services.outputService.print(
          `path (${path}) not defined in config for environment ${environment.name}`, this.services.outputService.TYPE_ERROR);
      return;
    }

    let fromPath = environment.paths[path];

    // TODO: Check path
    let backupPath = `${environment.paths.backup}/${pathPrefix}/${this.getTmpHash(path)}/`;

    this.services.outputService.printWithLoading(
        `backup ${fromPath}`
    );

    this.services.syncService.sync(fromPath, backupPath, environment, environment);

    return backupPath;
  }


  rollback(environment, id) {
    let configFileContent = this.readConfigFile(environment);

    if (id === undefined) {
      id = 0;
    }

    const backupConfig = configFileContent.backups[id];

    for (let pathConfig of backupConfig.paths) {
      const backupPath = pathConfig.backupPath + '*';
      const targetPath = environment.paths[pathConfig.path];
      this.services.syncService.sync(backupPath, targetPath, environment, environment);
    }
  }

  rm(environment, id) {
    const configFileContent = this.readConfigFile(environment);
    const backupConfig = configFileContent.backups[id];
    this.services.execService.exec(`rm -rf ${environment.paths.backup}/${backupConfig.pathPrefix}`);
    configFileContent.backups.splice(id, 1);
    this.writeConfigFile(environment, configFileContent);
  }

  /**
   * getTmpHash
   *
   * @param path
   * @returns {string}
   */
  getTmpHash(path) {
    return crypto.createHmac('sha256', path).
        update(path).
        digest('hex');
  }

  readConfigFile(environment) {
    let command = `cat ${environment.paths.backup}/backup.json 2>/dev/null`;

    if (this.services.sshService.useSsh(environment)) {
      command = this.services.sshService.wrapCommand(command, environment);
    }

    let fileValue = this.services.execService.exec(command);

    if (fileValue) {
      fileValue= JSON.parse(fileValue);
    } else {
      fileValue = {backups: []};
    }

    return fileValue;
  }

  writeConfigFile(environment, value) {
    const valueStr = JSON.stringify(value);
    let command = `echo '${valueStr}' > ${environment.paths.backup}/backup.json`;

    if (this.services.sshService.useSsh(environment)) {
      command = this.services.sshService.wrapCommand(command, environment);
    }
    this.services.execService.exec(command);
  }



}

module.exports = BackupService;