'use strict';

// Run with: npm test
// Checks the shell commands SyncService hands to execService. Nothing is executed:
// the stub only collects the commands.

const { test } = require('node:test');
const assert = require('node:assert/strict');

const SyncService = require('../lib/service/syncService');

function createSyncService() {
  const commands = [];
  const services = {
    execService: {
      exec(c) {
        if (Array.isArray(c)) commands.push(...c); else commands.push(c);
      }
    },
    outputService: { print() {} }
  };
  const syncService = new SyncService(services);
  // server -> server goes through a tmp dir; avoid touching the file system
  syncService.getFirstItemFromDirectory = () => 'app';
  return { syncService, commands };
}

const local = { name: 'local', ssh: { host: '' }, paths: { app: './dist/' } };
const live = {
  name: 'live',
  // ssh.rsyncParams was never read by zeche and must stay without effect
  ssh: { host: 'live.example', user: 'deploy', key: '/keys/live', params: '-p 2222', rsyncParams: '-az --delete' },
  paths: { app: '/var/www/app/' }
};
const stage = { name: 'stage', ssh: { host: 'stage.example', user: 'deploy', key: '/keys/stage', params: '' }, paths: { app: '/srv/app/' } };

test('without rsyncParameters the commands are the same as in 0.2.0', () => {
  const { syncService, commands } = createSyncService();

  syncService.sync('./dist/', '/var/www/app/', local, live);
  syncService.sync('/var/www/app/', './dist/', live, local);
  syncService.sync('./a/', './b/', local, { ...local, name: 'local2' });

  assert.deepEqual(commands, [
    // local -> server
    'ssh deploy@live.example -i /keys/live -p 2222 "mkdir -p /var/www/app"',
    'rsync -r --links -e "ssh -i /keys/live -p 2222" ./dist/ deploy@live.example:/var/www/app',
    // server -> local
    'mkdir -p ./dist',
    'rsync -r --links -e "ssh -i /keys/live -p 2222" deploy@live.example:/var/www/app/ ./dist',
    // local -> local
    'mkdir -p ./b',
    'rsync -r --links ./a/ ./b'
  ]);
});

test('server -> server without rsyncParameters is the same as in 0.2.0', () => {
  const { syncService, commands } = createSyncService();

  syncService.sync('/var/www/app/', '/srv/app/', live, stage);

  assert.equal(commands.length, 5);
  assert.equal(commands[0], 'mkdir -p /tmp/zechetmp/' + SyncService.getTmpHash('/var/www/app/') + '/');
  assert.match(commands[1], /^rsync -r --links -e "ssh -i \/keys\/live -p 2222" deploy@live\.example:\/var\/www\/app\/ \/tmp\/zechetmp\//);
  assert.equal(commands[2], 'ssh deploy@stage.example -i /keys/stage  "mkdir -p /srv/app"');
  assert.match(commands[3], /^rsync -r --links -e "ssh -i \/keys\/stage " \/tmp\/zechetmp\/[0-9a-f]+\/app deploy@stage\.example:\/srv\/app$/);
  assert.equal(commands[4], 'rm -rf /tmp/zechetmp');
});

test('rsyncParameters of the target environment replace the default flags on deploy', () => {
  const { syncService, commands } = createSyncService();
  const target = { ...live, rsyncParameters: '-az --delete --exclude=/.env' };

  syncService.sync('./dist/', '/var/www/app/incoming/', local, target);

  assert.equal(commands[1],
    'rsync -az --delete --exclude=/.env -e "ssh -i /keys/live -p 2222" ./dist/ deploy@live.example:/var/www/app/incoming');
});

test('rsyncParameters of the source environment are used when copying from a server', () => {
  const { syncService, commands } = createSyncService();
  const source = { ...live, rsyncParameters: ['-az', ' --delete ', '', '--exclude=/storage'] };

  syncService.sync('/var/www/app/', './backup/app/', source, local);

  assert.equal(commands[1],
    'rsync -az --delete --exclude=/storage -e "ssh -i /keys/live -p 2222" deploy@live.example:/var/www/app/ ./backup/app');
});

test('rsyncParameters: string, array, empty and missing values', () => {
  assert.equal(SyncService.rsyncParameters(undefined), '-r --links');
  assert.equal(SyncService.rsyncParameters({}), '-r --links');
  assert.equal(SyncService.rsyncParameters({ rsyncParameters: '' }), '-r --links');
  assert.equal(SyncService.rsyncParameters({ rsyncParameters: '   ' }), '-r --links');
  assert.equal(SyncService.rsyncParameters({ rsyncParameters: ' -a ' }), '-a');
  assert.equal(SyncService.rsyncParameters({ rsyncParameters: ['-a', '--delete'] }), '-a --delete');
  assert.equal(SyncService.rsyncParameters({ ssh: { rsyncParams: '-az --delete' } }), '-r --links');
});
