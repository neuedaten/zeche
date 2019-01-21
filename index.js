const path = require('path');
const { fork } = require('child_process');

const OutputService = require('./lib/service/outputService');
const outputService = new OutputService(this.services);

const processFork = fork(path.resolve(__dirname) + '/index-sync');

/**
 * send start command
 * + process.argv
 * + outputService
 */
processFork.send({action: 'start', argv: process.argv, outputService: outputService});

processFork.on('message', (message) => {
  switch(message.action) {
    case 'stop':
      outputService.hideLoading();
      break;
    case 'output':
      outputService[message.args.action](message.args.args);
      break;
  }
});
