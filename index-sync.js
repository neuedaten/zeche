const Zeche = require('./lib/zeche');
const z = new Zeche();

const OutputServiceFork = require('./lib/service/outputServiceFork');
const outputServiceFork = new OutputServiceFork();

const listener = process.on('message', async message => {

  switch(message.action) {
    case 'start':

      outputServiceFork.setCallback((action, args) => {
        listener.send({action: 'output', args: {action, args}});
      });

      z.setArgv(message.argv);
      z.setOutputService(outputServiceFork);
      z.init();
      break;
  }

  listener.removeAllListeners('message');
  listener.send({action: 'stop'});
});