'use strict';

const opn = require('opn');

class Browser {

  constructor(config, services, program) {
    this.config = config;
    this.services = services;
    this.program = program;

    this.initInterface();
  }

  initInterface () {
    this.program
    .command('browser <environment>')
    .alias('b')
    .description('Open browser')
    .action((environment) => {
      this.open(environment);
    });
  }

  open (environment) {
    if (environment in this.config.environments) {
      let url = '';
      let envObj = this.config.environments[environment];

      /** with user/password: */
      if ('user' in envObj.http && envObj.http.user !== '') {
        url = `${envObj.http.protocol}${envObj.http.user}:${envObj.http.password}@${envObj.http.host}`;
      }
      /** without user: */
      else {
        url = `${envObj.http.protocol}${envObj.http.host}`;
      }

      this.services.outputService.print(`opens ${url}`);
      opn(url, {wait: false});
    }
    else {
      this.services.outputService.print(`environment ${environment} not valid.`, this.services.outputService.TYPE_ERROR);
      console.log ();
    }
  }
}

module.exports = Browser;