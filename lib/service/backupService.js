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
    this.services.outputService.print(chalk.blue(`Rollback:`) + chalk.gray(` zeche backup rollback <id> <environment>`));
  }

  /**
   * backupFiles
   *
   * @param what
   * @param environment
   * @param paths
   * @param skipIfSourceNotExists
   */
  backupFiles(what, environment, paths, skipIfSourceNotExists) {

    const pathPrefix = this.getTmpHash(moment().format());
    let configFileContent = this.readConfigFile(environment);

    let backupConfig = {
      what: what,
      type: 'files',
      where: environment.name,
      dateTime: moment().format('DD.MM.YYYY HH:mm:ss'),
      pathPrefix: pathPrefix,
      paths: []
    };

    /** Remove old backups:*/
    this.removeOldBackup(environment);

    /** Reload configuration: */
    configFileContent = this.readConfigFile(environment);

    /** Skip if fromPath not exists: */
    if (skipIfSourceNotExists) {
      for (let path of paths) {
        let fromPath = environment.paths[path];
        let testCommand = `test -d ${fromPath} || test -f ${fromPath} && echo '1' || echo '0'`;
        if (this.services.sshService.useSsh(environment)) {
          testCommand = this.services.sshService.wrapCommand(testCommand, environment);
        }
        let testResult =  this.services.execService.exec(testCommand);
        if (_.trim(testResult) === '0') {
          return;
        }
      }
    }

    /** Backup: */
    for (let path of paths) {
      let backupPath = this.copyPath(pathPrefix, path, environment);
      backupConfig.paths.push({path: path, backupPath: backupPath});
    }

    /** Write backup notes to config file: */
    configFileContent.backups.push(backupConfig);
    this.writeConfigFile(environment, configFileContent);
  }


  backupDatabase(what, environment, silent) {
    const pathPrefix = this.getTmpHash(moment().format());

    let backupConfig = {
      what: 'database: ' + what,
      type: 'database',
      where: environment.name,
      dateTime: moment().format('DD.MM.YYYY HH:mm:ss'),
      pathPrefix: pathPrefix,
      paths: []
    };

    /** Remove old backups:*/
    this.removeOldBackup(environment);

    /** Reload configuration: */
    let configFileContent = this.readConfigFile(environment);

    let backupPath = `${environment.paths.backup}/${pathPrefix}/${this.getTmpHash(what)}/`;

    backupConfig.paths.push({path: what, backupPath: backupPath});

    if (!silent) {
      this.services.outputService.printWithLoading(
          `backup database ${what}`
      );
    }

    const filename = `${environment.db.database}.sql`;

    /** Export: */
    let commands = [
      `mysqldump --opt -h ${environment.db.host} -P ${environment.db.port} -u ${environment.db.user} -p'${environment.db.password}' ${environment.db.database} > ${backupPath}/${filename}`,
    ];

    /** Container exec for docker/vagrant: */
    if (_.has(environment, 'db.container_exec')) {
      commands = commands.map(command => {
        return `${environment.db.container_exec} ${command}`;
      });
    }

    commands.unshift(`mkdir -p ${backupPath}`);

    if (this.services.sshService.useSsh(environment)) {
      commands = commands.map(command => {
        return this.services.sshService.wrapCommand(command, environment);
      });
    }

    this.services.execService.exec(commands);

    /** Write backup notes to config file: */
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

    if (!_.has(environment, 'paths.backup')) {
      this.services.outputService.print(
          `no backup path in environment ${environment.name}`, this.services.outputService.TYPE_ERROR);
      return;
    }

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

    switch(backupConfig.type) {
      case 'files':
        this.rollbackFiles(environment, id);
        break;
      case 'database':
        this.rollbackDatabase(environment, id);
        break;
    }
  }

  rollbackFiles(environment, id) {
    let configFileContent = this.readConfigFile(environment);

    const backupConfig = configFileContent.backups[id];

    for (let pathConfig of backupConfig.paths) {
      const backupPath = pathConfig.backupPath + '*';
      const targetPath = environment.paths[pathConfig.path];
      this.services.syncService.sync(backupPath, targetPath, environment, environment);
    }
  }

  rollbackDatabase(environment, id) {
    let configFileContent = this.readConfigFile(environment);

    const backupConfig = configFileContent.backups[id];
    const backupPath = backupConfig.paths[0].backupPath + '*';

    let command = `mysql -h ${environment.db.host} -P ${environment.db.port} -u ${environment.db.user} -p'${environment.db.password}' ${environment.db.database} < ${backupPath}`;

    /** Container exec for docker/vagrant: */
    if (environment.db.container_exec) {
        command = `cat ${backupPath} | ${environment.db.container_exec} mysql -h ${environment.db.host} -P ${environment.db.port} -u ${environment.db.user} -p'${environment.db.password}' ${environment.db.database}`;
    }

    if (this.services.sshService.useSsh(environment)) {
      command = this.services.sshService.wrapCommand(command, environment);
    }

    this.services.execService.exec(command);
  }

  rm(environment, id) {
    const configFileContent = this.readConfigFile(environment);
    const backupConfig = configFileContent.backups[id];

    let command = `rm -rf ${environment.paths.backup}/${backupConfig.pathPrefix}`;
    if (this.services.sshService.useSsh(environment)) {
      command = this.services.sshService.wrapCommand(command, environment);
    }

    this.services.execService.exec(command);

    configFileContent.backups.splice(id, 1);
    this.writeConfigFile(environment, configFileContent);
  }

  removeOldBackup(environment) {
    if (_.has(environment, 'backup.maximumBackups')) {
      const maximumBackups = _.get(environment, 'backup.maximumBackups');
      let configFileContent = this.readConfigFile(environment);

      if (configFileContent.backups.length >= maximumBackups) {
        this.rm(environment, 0);
      }
    }
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