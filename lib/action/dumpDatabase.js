'use strict';

const _ = require('lodash');
const moment = require('moment');
const TMP_DIR = '/tmp/zechetmp';

module.exports = class DumpDatabase {

  /**
   * @param config
   * @param services
   * @param program
   */
  constructor(config, services, program) {
    this.config = config;
    this.services = services;
    this.program = program;
    this.sets = this.config['sets'];

    this.initInterface();
  }

  initInterface() {
    this.program.command('dump <what> <exactly> <where>').
        alias('du').
        description('Dump database').
        option('-f, --filename [value]', 'dump filename').
        option('-d, --date', 'add current date to filename').
        action((what, exactly, where, cmd) => {

          if (!['import', 'export'].includes(what)) return;

          this.services.outputService.printWithLoading(
              `dump ${what} ${exactly} on ${where}`);

          this.services.hookService.call(`dump.before`,
              {what, exactly, where});

          switch(what) {
            case 'import':
              this.import(exactly, where);
              break;
            case 'export':
              this.export(exactly, where, cmd.filename, cmd.date);
          }


          this.services.outputService.hideLoading();

          this.services.hookService.call(`dump.after`,
              {what, exactly, where});
        });
  }

  /**
   * deploy
   *
   * @param exactly
   * @param where
   * @param filename
   * @param addDate
   */
  export(exactly, where, filename, addDate = false) {

    if (!_.has(this.config, `sets.dump.${exactly}`)) {
      this.services.outputService.hideLoading(
          `set dump.${exactly} does not exist in configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    if (!_.has(this.config, `environments.${where}`)) {
      this.services.outputService.hideLoading(
          `environment ${where} does not exist in configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }
    const environment = _.get(this.config, `environments.${where}`);

    /** Filename: */
    let fullFilename;
    if (filename) {
      fullFilename = filename;
    } else {
      fullFilename = `${environment.db.database}.sql`;
    }
    if (addDate) {
      fullFilename = `${moment().
        format('YYYY_MM_DD_HH_mm_ss')}__${fullFilename}`;
    }

    /** Path: */
    let pathName = _.get(this.config, `sets.dump.${exactly}.exportPath`);
    let path = _.get(environment, `paths.${pathName}`);

    if (!pathName) {
      this.services.outputService.hideLoading(
          `exportPath not defined in configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    if (!path) {
      this.services.outputService.hideLoading(
          `path ${pathName} not defined in environment ${environment.name}`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    /** Export: */
    let commands = [
      `mkdir -p ${path}`,
      `mysqldump --opt -h ${environment.db.host} -P ${environment.db.port} -u ${environment.db.user} -p'${environment.db.password}' ${environment.db.database} > ${path}/${fullFilename}`,
    ];

    /** Container exec for docker/vagrant: */
    if (_.has(environment, 'db.container_exec')) {
      commands = commands.map(command => {
        return `${environment.db.container_exec} ${command}`;
      });
    }

    if (this.services.sshService.useSsh(environment)) {
      commands = commands.map(command => {
        return this.services.sshService.wrapCommand(command, environment);
      });
    }

    this.services.execService.exec(commands);
  }

  import(exactly, where, filename) {

    if (!_.has(this.config, `sets.dump.${exactly}`)) {
      this.services.outputService.hideLoading(
          `set dump.${exactly} does not exist in configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    if (!_.has(this.config, `environments.${where}`)) {
      this.services.outputService.hideLoading(
          `environment ${where} does not exist in configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }
    const environment = _.get(this.config, `environments.${where}`);

    /** Filename: */
    let fullFilename;
    if (filename) {
      fullFilename = filename;
    } else {
      fullFilename = `${environment.db.database}.sql`;
    }

    /** Path: */
    let pathName = _.get(this.config, `sets.dump.${exactly}.exportPath`);
    let path = _.get(environment, `paths.${pathName}`);

    if (!pathName) {
      this.services.outputService.hideLoading(
          `exportPath not defined in configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    if (!path) {
      this.services.outputService.hideLoading(
          `path ${pathName} not defined in environment ${environment.name}`,
          this.services.outputService.TYPE_ERROR);
      return;
    }


    let commands = [
      `mysql -h ${environment.db.host} -P ${environment.db.port} -u ${environment.db.user} -p'${environment.db.password}' ${environment.db.database} < ${path}/${fullFilename}`,
    ];

    /** Container exec for docker/vagrant: */
    if (environment.db.container_exec) {
      commands = commands.map(command => {
        return `${environment.db.container_exec} ${command}`;
      });
    }

    if (this.services.sshService.useSsh(environment)) {
      commands = commands.map(command => {
        return this.services.sshService.wrapCommand(command, environment);
      });
    }

    this.services.execService.exec(commands);
  }
};