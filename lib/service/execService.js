'use strict';

const childProcess = require('child_process');
//const {execSync} = require('child_process');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

class ExecService {

  constructor(services) {
    this.services = services;
    this.dry = false;
  }

  exec(commands) {
    if (Array.isArray(commands)) {
      for (let command of commands) {
        this.exec(command);
      }
    } else {
      if (this.dry === true) {
        console.log(commands);
        return;
      }
      try {
        const result = childProcess.execSync(commands, {stdio: 'pipe'});
        return result.toString();
      } catch (e) {
        this.services.outputService.hideLoading(e.stderr.toString(), this.services.outputService.TYPE_ERROR);
      }
    }
  }
}

module.exports = ExecService;
