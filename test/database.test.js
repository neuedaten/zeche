'use strict';

// Run with: npm test
// Checks the shell commands of the database actions. Nothing is executed: the stub collects them.
// Covers db.ssh (separate login), db.tools (program names), db.socket (-S) and the two mkdir fixes.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const SshService = require('../lib/service/sshService');
const SyncService = require('../lib/service/syncService');
const BackupService = require('../lib/service/backupService');
const DeployDatabase = require('../lib/action/deployDatabase');
const DumpDatabase = require('../lib/action/dumpDatabase');

function createServices() {
  const commands = [];
  const services = {
    execService: { exec(c) { (Array.isArray(c) ? c : [c]).forEach(x => commands.push(x)); return ''; } },
    outputService: { print() {}, printWithLoading() {}, hideLoading() {}, TYPE_ERROR: 'error', TYPE_INFO: 'info' },
    hookService: { call() {} }
  };
  services.sshService = new SshService(services);
  services.syncService = new SyncService(services);
  services.backupService = new BackupService(services);
  return { services, commands };
}

// commander stub: the actions only register commands in the constructor
const program = { command() { return this; }, alias() { return this; }, description() { return this; }, option() { return this; }, action() { return this; } };

const local = {
  name: 'local',
  ssh: { host: '' },
  db: { host: '127.0.0.1', port: '3306', database: 'app', user: 'app', password: 'pw',
        container_exec: 'docker exec -i app-db', tools: { dump: 'mariadb-dump', client: 'mariadb' } },
  paths: { app: './', tmpDir: 'deploy/tmp', dumps: 'deploy/dumps' }
};
const live = {
  name: 'live',
  ssh: { host: 'live.example', user: 'deploy', key: '/keys/deploy', params: '-p 22' },
  rsyncParameters: '-az --delete --exclude=/.env',
  db: { host: 'localhost', port: '3306', socket: '/run/mysqld/mysqld.sock', database: 'app_live', user: 'app_live', password: 'secret',
        ssh: { user: 'root', key: '/keys/admin' } },
  backup: { autoBackup: true, maximumBackups: 5 },
  paths: { app: '/var/www/app/incoming/', backup: '/var/backups/zeche/app', tmpDir: '/tmp/zechetmp' }
};
const config = { environments: { local, live }, sets: { deploy: { db: { all: { ways: [['live', 'local'], ['local', 'live']] } } }, dump: { all: { exportPath: 'dumps' } } } };

test('forDatabase replaces ssh with db.ssh field by field, files are untouched', () => {
  const { services } = createServices();
  const dbLive = services.sshService.forDatabase(live);
  assert.deepEqual(dbLive.ssh, { host: 'live.example', user: 'root', key: '/keys/admin', params: '-p 22' });
  assert.equal(live.ssh.user, 'deploy', 'original environment is not modified');
  assert.equal(services.sshService.forDatabase(local), local, 'without db.ssh the environment is returned as is');
});

test('deploy db live -> local: dump as root over the socket, import through the container with mariadb', () => {
  const { services, commands } = createServices();
  new DeployDatabase(config, services, program).deploy('all', 'live', 'local');
  const [mkdirRemote, dump, mkdirLocal, copy, mkdirLocal2, imp, rmRemote, rmLocal] = commands;
  assert.match(mkdirRemote, /^ssh root@live\.example -i \/keys\/admin -p 22 "mkdir -p \/tmp\/zechetmp"$/);
  assert.match(dump, /^ssh root@live\.example -i \/keys\/admin .*"mysqldump --opt -S \/run\/mysqld\/mysqld\.sock -u app_live -p'secret' app_live > \/tmp\/zechetmp\/app_live__.*\.sql"$/);
  assert.equal(mkdirLocal, 'mkdir -p deploy/tmp');
  assert.match(copy, /^rsync -r --links -e "ssh -i \/keys\/admin -p 22" root@live\.example:\/tmp\/zechetmp\/app_live__.*\.sql deploy\/tmp$/,
    'the dump file is copied with the admin login and without rsyncParameters');
  assert.equal(mkdirLocal2, 'mkdir -p deploy/tmp', 'mkdir for the target belongs to the import commands');
  assert.match(imp, /^docker exec -i app-db mariadb -h 127\.0\.0\.1 -P 3306 -u app -p'pw' app < deploy\/tmp\/app_live__.*\.sql$/);
  assert.match(rmRemote, /^ssh root@live\.example .*"rm \/tmp\/zechetmp\/app_live__.*\.sql"$/);
  assert.match(rmLocal, /^rm deploy\/tmp\/app_live__.*\.sql$/);
});

test('deploy db local -> live: auto backup and import run as root, dump comes from the container', () => {
  const { services, commands } = createServices();
  new DeployDatabase(config, services, program).deploy('all', 'local', 'live');
  const asRoot = commands.filter(c => c.startsWith('ssh root@live.example -i /keys/admin'));
  const asDeploy = commands.filter(c => c.includes('deploy@live.example'));
  assert.equal(asDeploy.length, 0, 'the deploy login is never used for database work');
  assert.ok(asRoot.some(c => c.includes('mysqldump --opt -S /run/mysqld/mysqld.sock -u app_live') && c.includes('/var/backups/zeche/app/')), 'backup before import');
  assert.ok(asRoot.some(c => c.includes('backup.json')), 'backup store is written through db.ssh');
  assert.ok(commands.some(c => /^docker exec -i app-db mariadb-dump --opt -h 127\.0\.0\.1 -P 3306 -u app -p'pw' app > deploy\/tmp\/app__.*\.sql$/.test(c)), 'local dump uses db.tools.dump inside the container');
  assert.ok(asRoot.some(c => /"mysql -S \/run\/mysqld\/mysqld\.sock -u app_live -p'secret' app_live < \/tmp\/zechetmp\/app__.*\.sql"$/.test(c)), 'import over the socket as root');
  const copy = commands.find(c => c.startsWith('rsync'));
  assert.match(copy, /^rsync -r --links -e "ssh -i \/keys\/admin -p 22" deploy\/tmp\/app__.*\.sql root@live\.example:\/tmp\/zechetmp$/);
});

test('dump export: mkdir runs on the host, the dump program inside the container', () => {
  const { services, commands } = createServices();
  new DumpDatabase(config, services, program).export('all', 'local');
  assert.equal(commands[0], 'mkdir -p deploy/dumps');
  assert.equal(commands[1], "docker exec -i app-db mariadb-dump --opt -h 127.0.0.1 -P 3306 -u app -p'pw' app > deploy/dumps/app.sql");
});

test('without db.tools and db.socket the commands are the same as in 0.3.0', () => {
  const { services } = createServices();
  const plain = { db: { host: 'db.example', port: '3306' } };
  assert.equal(services.sshService.dbTool(plain, 'dump'), 'mysqldump');
  assert.equal(services.sshService.dbTool(plain, 'client'), 'mysql');
  assert.equal(services.sshService.dbConnection(plain), '-h db.example -P 3306');
});

test('deploy db without db.ssh, db.socket and db.tools: the commands of 0.3.0, plus the mkdir for the target', () => {
  // Verified against the 0.3.0 code: byte for byte the same list, except for the second
  // 'mkdir -p deploy/tmp', which 0.3.0 appended to the export list after it had already run.
  const plainLocal = { name: 'local', ssh: { host: '' },
    db: { host: '127.0.0.1', port: '3306', database: 'app', user: 'app', password: 'pw' },
    paths: { app: './', tmpDir: 'deploy/tmp' } };
  const plainLive = { name: 'live', ssh: { host: 'live.example', user: 'deploy', key: '/keys/deploy', params: '-p 22' },
    db: { host: 'localhost', port: '3306', database: 'app_live', user: 'app_live', password: 'secret' },
    paths: { app: '/var/www/app/', tmpDir: '/tmp/zechetmp' } };
  const plainConfig = { environments: { local: plainLocal, live: plainLive }, sets: { deploy: { db: { all: { ways: [['live', 'local']] } } } } };

  const { services, commands } = createServices();
  new DeployDatabase(plainConfig, services, program).deploy('all', 'live', 'local');
  const normalized = commands.map(c => c.replace(/__\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}/g, '__DATE'));
  assert.deepEqual(normalized, [
    'ssh deploy@live.example -i /keys/deploy -p 22 "mkdir -p /tmp/zechetmp"',
    'ssh deploy@live.example -i /keys/deploy -p 22 "mysqldump --opt -h localhost -P 3306 -u app_live -p\'secret\' app_live > /tmp/zechetmp/app_live__DATE.sql"',
    'mkdir -p deploy/tmp',
    'rsync -r --links -e "ssh -i /keys/deploy -p 22" deploy@live.example:/tmp/zechetmp/app_live__DATE.sql deploy/tmp',
    'mkdir -p deploy/tmp',
    'mysql -h 127.0.0.1 -P 3306 -u app -p\'pw\' app < deploy/tmp/app_live__DATE.sql',
    'ssh deploy@live.example -i /keys/deploy -p 22 "rm /tmp/zechetmp/app_live__DATE.sql"',
    'rm deploy/tmp/app_live__DATE.sql'
  ]);
});
