'use strict';

const childProcess = require('child_process');
const spawn = childProcess.spawn;
const _ = require('lodash');

module.exports = class Ssh {

  constructor(config, services, program) {
    this.config = config;
    this.services = services;
    this.program = program;

    this.initInterface();
  }

  initInterface () {
    this.program
    .command('ssh <environment>')
    .description('Open SSH Shell')
    .action((environment) => {

      this.services.hookService.call(`ssh.before`,
          {environment});

      this.open(environment);
    });
  }

  open (environment) {
    if (!_.has(this.config, `environments.${environment}`)) {
      this.services.outputService.print(
          `environment ${environment} does not exist in configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    const environmentObj = _.get(this.config, `environments.${environment}`);
    let command;

    /** TODO: find better way to handle special shell logins for docker/vagrant :*/
    if (_.has(environmentObj, 'ssh.shell')) {
      command = environmentObj.ssh.shell;
    } else {
      command = `ssh ${environmentObj.ssh.user}@${environmentObj.ssh.host} -i ${environmentObj.ssh.key} ${environmentObj.ssh.params}`;
    }

    process.stdin.pause();

    let p = spawn(command, {
      shell: true,
      env: process.env,
      stdio: 'inherit',
    });

    p.on('exit', () => {
      process.stdin.resume();
      return process.exit();
    });

  }
};