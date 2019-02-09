'use strict';

const crypto = require('crypto');
const fs = require('fs');

const TMP_DIR = '/tmp/zechetmp';

class SyncService {

  /**
   * constructor
   *
   * @param services
   */
  constructor(services) {
    this.services = services;
  }

  /**
   * sync
   *
   * @param source
   * @param target
   * @param sourceEnvironment
   * @param targetEnvironment
   */
  sync(source, target, sourceEnvironment, targetEnvironment) {
    if (SyncService.useSshForRsync(sourceEnvironment) &&
        SyncService.useSshForRsync(targetEnvironment)) {
      const tmpHash = SyncService.getTmpHash(source);

      this.toTmp(sourceEnvironment, targetEnvironment, source, tmpHash);
      this.fromTmp(sourceEnvironment, targetEnvironment, target, tmpHash);
      this.clearTmp();
    } else {

      let targetParts = target.split('/');
      targetParts.pop();
      target = targetParts.join('/');

      if (!SyncService.useSshForRsync(sourceEnvironment) && !SyncService.useSshForRsync(targetEnvironment)) {
        this.localToLocal(source, target);
      }
      else if (SyncService.useSshForRsync(sourceEnvironment)) {
        this.serverToLocal(source, target, sourceEnvironment);
      } else {
        this.localToServer(source, target, targetEnvironment);
      }
    }
  }

  /**
   * localToLocal
   *
   * @param source
   * @param target
   */
  localToLocal(source, target) {
    let commands = [
      `mkdir -p ${target}`,
      `rsync -r ${source} ${target}`
    ];
    this.services.execService.exec(commands);
  }

  localToServer(source, target, targetEnvironment) {
    const sshParams = targetEnvironment.ssh.params;
    const user = targetEnvironment.ssh.user;
    const host = targetEnvironment.ssh.host;
    const key = targetEnvironment.ssh.key;
    let commands = [
      SyncService.getSSHCommand(targetEnvironment, `mkdir -p ${target}`),
      `rsync -r -e "ssh -i ${key} ${sshParams}" ${source} ${user}@${host}:${target}`
    ];
    this.services.execService.exec(commands);
  }

  /**
   * serverToLocal
   *
   * @param source
   * @param target
   * @param sourceEnvironment
   */
  serverToLocal(source, target, sourceEnvironment) {
    const sshParams = sourceEnvironment.ssh.params;
    const user = sourceEnvironment.ssh.user;
    const host = sourceEnvironment.ssh.host;
    const key = sourceEnvironment.ssh.key;
    let commands = [];
    commands.push(`mkdir -p ${target}`);
    commands.push(`rsync -r -e "ssh -i ${key} ${sshParams}" ${user}@${host}:${source} ${target}`);

    this.services.execService.exec(commands);
  }

  /**
   * toTmp
   *
   * @param sourceEnvironment
   * @param targetEnvironment
   * @param path
   * @param tpmHash
   */
  toTmp(sourceEnvironment, targetEnvironment, path, tpmHash) {
    const targetDir = `${TMP_DIR}/${tpmHash}/`;

    if (SyncService.useSshForRsync(sourceEnvironment)) {
      this.serverToLocal(path, targetDir, sourceEnvironment);
    } else {
      this.localToLocal(path, targetDir);
    }

    this.services.outputService.print(`copy ${path} @ ${sourceEnvironment.name} to tmp`);
  }

  /**
   * fromTmp
   *
   * @param sourceEnvironment
   * @param targetEnvironment
   * @param path
   * @param tpmHash
   */
  fromTmp(sourceEnvironment, targetEnvironment, path, tpmHash) {
    const sourceDir = `${TMP_DIR}/${tpmHash}/`;
    const source = sourceDir + this.getFirstItemFromDirectory(sourceDir);

    let pathParts = path.split('/');
    pathParts.pop();
    path = pathParts.join('/');

    if (SyncService.useSshForRsync(targetEnvironment)) {
      this.localToServer(source, path, targetEnvironment);
    } else {
      this.localToLocal(source, path);
    }

    this.services.outputService.print(`copy from tmp to ${path} @ ${targetEnvironment.name}`);
  }

  /**
   * getTmpHash
   *
   * @param path
   * @returns {PromiseLike<ArrayBuffer>}
   */
  static getTmpHash(path) {
    return crypto.createHmac('sha256', path).
        update(path).
        digest('hex');
  }

  /**
   * clearTmp
   */
  clearTmp() {
    this.services.execService.exec(`rm -rf ${TMP_DIR}`);
  }

  /**
   * getFirstItemFromDirectory
   *
   * @param dir
   * @returns {*}
   */
  getFirstItemFromDirectory(dir) {
    const files = fs.readdirSync(dir);
    return files[0];
  }

  /**
   * useSshForRsync
   *
   * returns true if ssh host is available
   *
   * @param environment
   * @returns {boolean}
   */
  static useSshForRsync(environment) {
    return !!(environment.ssh.host && environment.ssh.host !== '');
  }

  /* TODO: Move to service class:*/
  static getSSHCommand(environment, command) {
    return `ssh ${environment.ssh.user}@${environment.ssh.host} -i ${environment.ssh.key} ${environment.ssh.params} "${command}"`;
  }

}

module.exports = SyncService;