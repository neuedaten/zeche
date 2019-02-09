'use strict';

const _ = require('lodash');

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

    if (_.has(this.config, 'sets.backup.files')) {
      this.sets = _.get('sets.backup.files');
    }

    this.initInterface();
  }

  initInterface() {

    this.program.command('backup [what] [exactly] [where]').
        action((what, exactly, where) => {

          if (what !== 'files') return;

          if (exactly === undefined) {
            this.services.outputService.print(
                'error: missing required argument `exactly`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          if (where === undefined) {
            this.services.outputService.print(
                'error: missing required argument `where`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          this.services.hookService.call(`backup.${what}.${exactly}.before`,
              {what, exactly, where});

          this.services.outputService.print(
              `backup files (${exactly}) on ${where}`,
              this.services.outputService.TYPE_INFO,
          );

          if (!this.sets.hasOwnProperty(exactly)) {
            this.services.outputService.print(`set (${exactly}) not exist in configuration`);
            return;
          }
          let set = this.sets[exactly];
          let paths = set.paths;

          let environment = this.config.environments[where];
          this.services.backupService.backupFiles(exactly, environment, paths);

          this.services.hookService.call(`backup.${what}.${exactly}.after`,
              {what, exactly, where});
          this.services.outputService.hideLoading();
        });

    this.program.command('backup [what] [exactly] [where]').
        action((what, exactly, where) => {

          if (what !== 'db') return;

          if (exactly === undefined) {
            this.services.outputService.print(
                'error: missing required argument `exactly`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          if (where === undefined) {
            this.services.outputService.print(
                'error: missing required argument `where`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          this.services.hookService.call(`backup.${what}.${exactly}.before`,
              {what, exactly, where});

          this.services.outputService.print(
              `backup db (${exactly}) on ${where}`,
              this.services.outputService.TYPE_INFO,
          );

          let environment = this.config.environments[where];
          this.services.backupService.backupDatabase(exactly, environment);

          this.services.hookService.call(`backup.${what}.${exactly}.after`,
              {what, exactly, where});
          this.services.outputService.hideLoading();
        });

    this.program.command('backup [what] [id] [where]').
        description('Backup rm').
        action((what, id, where) => {

          if (what !== 'rm') {
            return;
          }

          if (where === undefined) {
            this.services.outputService.print(
                'error: missing required argument `where`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          if (id === undefined) {
            this.services.outputService.print(
                'error: missing required argument `id`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          id = parseInt(id);

          this.services.hookService.call(`backup.rm.${where}.before`,
              {where, id});

          let environment = this.config.environments[where];
          this.services.backupService.rm(environment, id);

          this.services.hookService.call(`backup.rm.${where}.after`,
              {where, id});
          this.services.outputService.hideLoading();
        });

    this.program.command('backup [what] [where] [null]').
        description('Backup list').
        action((what, where) => {

          if (what !== 'list') {
            return;
          }

          if (where === undefined) {
            this.services.outputService.print(
                'error: missing required argument `where`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          this.services.hookService.call(`backup.list.${where}.before`,
              {where});

          let environment = this.config.environments[where];
          this.services.backupService.showList(environment);

          this.services.hookService.call(`backup.list.${where}.after`, {where});
          this.services.outputService.hideLoading();
        });

    this.program.command('backup [what] [id] [where]').
        description('rollback').
        action((what, id, where) => {

          if (what !== 'rollback') {
            return;
          }

          if (id === undefined) {
            this.services.outputService.print(
                'error: missing required argument `id`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          if (where === undefined) {
            this.services.outputService.print(
                'error: missing required argument `where`',
                this.services.outputService.TYPE_ERROR);
            return;
          }

          this.services.hookService.call(`backup.rollback.${where}.before`,
              {where});

          let environment = this.config.environments[where];
          this.services.backupService.rollback(environment, id);

          this.services.hookService.call(`backup.rollback.${where}.after`,
              {where});
          this.services.outputService.hideLoading();
        });
  }
}

module.exports = Backup;