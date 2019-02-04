'use strict';

class SshService {

  constructor(services) {
    this.services = services;
  }

  wrapCommand(command, environment) {
//    command = command.replace(/abc/g, '');
    return `ssh ${environment.ssh.user}@${environment.ssh.host} -i ${environment.ssh.key} ${environment.ssh.params} "${this.escape(command)}"`;
  }

  escape(command) {
    command = command.replace(/"/gi, '\\"');
    return command;
  }

  /**
   * useSsh
   *
   * returns true if ssh host is available
   *
   * @param environment
   * @returns {boolean}
   */
  useSsh(environment) {
    return !!(environment.ssh.host && environment.ssh.host !== '');
  }

}

module.exports = SshService;