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
    return !!(environment.ssh && environment.ssh.host && environment.ssh.host !== '');
  }

  /**
   * forDatabase
   *
   * The environment as seen by database and backup commands. If `db.ssh` is set, it replaces
   * `ssh` (field by field: host, user, key, params) – for servers where the deploy login is
   * restricted to rsync and database work needs a different, privileged login. The backup
   * store (`paths.backup`, backup.json) is reached the same way, because it lives on that host.
   * Without `db.ssh` the environment is returned unchanged.
   *
   * @param environment
   * @returns {object}
   */
  forDatabase(environment) {
    if (!environment || !environment.db || !environment.db.ssh) return environment;
    return Object.assign({}, environment, {
      ssh: Object.assign({}, environment.ssh || {}, environment.db.ssh)
    });
  }

  /**
   * dbTool
   *
   * Name of the dump or client program: `db.tools.dump` / `db.tools.client`, default
   * mysqldump / mysql. MariaDB 11 images ship only mariadb-dump / mariadb.
   *
   * @param environment
   * @param which  'dump' | 'client'
   * @returns {string}
   */
  dbTool(environment, which) {
    const tools = (environment && environment.db && environment.db.tools) || {};
    if (which === 'dump') return tools.dump || 'mysqldump';
    return tools.client || 'mysql';
  }

  /**
   * dbConnection
   *
   * Connection arguments for the dump and client programs: `-S <socket>` when `db.socket` is
   * set (the only way to reach a MariaDB that accepts the user from localhost but not from
   * 127.0.0.1), otherwise `-h <host> -P <port>` as before.
   *
   * @param environment
   * @returns {string}
   */
  dbConnection(environment) {
    const db = (environment && environment.db) || {};
    if (db.socket) return `-S ${db.socket}`;
    return `-h ${db.host} -P ${db.port}`;
  }

}

module.exports = SshService;