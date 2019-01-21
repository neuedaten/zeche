'use strict';

const _ = require('lodash');

class HookService {

  constructor(services, config) {
    this.services = services;
    this.config = config;
  }

  call(path, params) {
    const fullPath = `sets.${path}`;

    if (_.has(this.config, fullPath)) {
      _.get(this.config, fullPath)(this.config, this.services, params);
    }
  }
}

//   /** run before hook:*/
//   if (_.has(this.config, `sets.deploy.${what}.${exactly}.before`)) {
//     const services = {
//       outputService: outputService,
//       execService: execService,
//       syncService: syncService,
//       sshService: sshService
//     };
//     this.config['sets']['deploy'][what][exactly].before(this.config, services, what, exactly, from, to);
//   }

module.exports = HookService;