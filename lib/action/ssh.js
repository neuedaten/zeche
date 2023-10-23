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
    .command('ssh <environment> [environment2]')
    .description('Open SSH Shell')
    .action((environment, environment2) => {
        this.services.hookService.call(`ssh.before`,
            {environment});

      if (environment === 'init') {
        this.init(environment2);
      } else {
        this.open(environment);
      }
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

  init(environment) {
    if (!_.has(this.config, `environments.${environment}`)) {
      this.services.outputService.print(
          `environment ${environment} does not exist in configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    const environmentObj = _.get(this.config, `environments.${environment}`);

//    console.log(environmentObj);

    if (!_.has(environmentObj, `ssh.key`)) {
      this.services.outputService.print(
          `environment ${environment} has no ssh.key configuration`,
          this.services.outputService.TYPE_ERROR);
      return;
    }

    this.services.outputService.print(
        `Password: ${_.get(environmentObj, 'ssh.password')}`,
        this.services.outputService.TYPE_INFO);

    let commands = [
      `ssh-keygen -t rsa -b 4096 -f ${_.get(environmentObj, 'ssh.key' )} -q -P ""`,
      `cat ${_.get(environmentObj, 'ssh.key' )}.pub | ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no ${_.get(environmentObj, 'ssh.user' )}@${_.get(environmentObj, 'ssh.host' )} "cat >> ~/.ssh/authorized_keys"`
    ];

    this.services.execService.exec(commands);

  }
};
