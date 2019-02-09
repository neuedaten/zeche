const ROOT = process.env.PWD;

const _ = require('lodash');
const program = require('commander');

const HookService = require('./service/hookService');
const ExecService = require('./service/execService');
const SyncService = require('./service/syncService');
const SshService = require('./service/sshService');
const BackupService = require('./service/backupService');

const Browser = require('./action/browser');
const DeployFiles = require('./action/deployFiles');
const DeployDatabase = require('./action/deployDatabase');
const Dump = require('./action/dumpDatabase');
const Ssh = require('./action/ssh');
const Backup = require('./action/backup');

class Zeche {

  loadConfig() {
    try {
      this.config = require(`${ROOT}/zeche.config.js`);
    } catch (e) {
      console.log('no config file? ' + e);
      process.exit(1);
    }
  }

  initServices() {
    this.services.execService = new ExecService(this.services);
    this.services.hookService = new HookService(this.services, this.config);
    this.services.syncService = new SyncService(this.services);
    this.services.sshService = new SshService(this.services);
    this.services.backupService = new BackupService(this.services);
  }

  constructor() {
    this.services = {};
  }

  init() {
    this.loadConfig();
    this.initServices();

    /** DeployFiles: */
    new DeployFiles(this.config, this.services, program);

    /** DeployDatabase: */
    new DeployDatabase(this.config, this.services, program);

    /** Browser: */
    new Browser(this.config, this.services, program);

    /** Dump: */
    new Dump(this.config, this.services, program);

    /** SSH: */
    new Ssh(this.config, this.services, program);

    /** Backup: */
    new Backup(this.config, this.services, program);

    program.parse(this.argv);
  }

  setArgv(argv) {
    this.argv = argv;
  }

  setOutputService(outputService) {
    this.services.outputService = outputService;
  }
}

module.exports = Zeche;