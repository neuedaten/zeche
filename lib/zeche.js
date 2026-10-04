const ROOT = process.env.PWD;

const fs = require('fs');
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
    // zeche.config.cjs first: in a project with "type": "module" (Vite, …) a .js file is ESM and
    // cannot use module.exports. An ESM default export is unwrapped as well.
    // The file is picked by existence, so an error inside it (e.g. a missing module it requires)
    // is reported instead of being mistaken for a missing config file.
    const candidates = ['zeche.config.cjs', 'zeche.config.js'];
    const file = candidates.find(name => fs.existsSync(`${ROOT}/${name}`));
    if (!file) {
      console.log(`no config file? expected ${candidates.join(' or ')} in ${ROOT}`);
      process.exit(1);
    }
    let config;
    try {
      config = require(`${ROOT}/${file}`);
    } catch (e) {
      console.log(`error loading ${file}: ` + e);
      process.exit(1);
    }
    if (config && config.default && !config.environments) config = config.default;
    this.config = config;
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