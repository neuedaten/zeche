'use strict';

// Run with: npm test
// Config loading: zeche.config.cjs is preferred over zeche.config.js, an ESM default export is unwrapped.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ZECHE = require.resolve('../lib/zeche');

function loadConfigIn(dir, files) {
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  // lib/zeche.js reads process.env.PWD at require time
  const pwd = process.env.PWD;
  process.env.PWD = dir;
  delete require.cache[ZECHE];
  try {
    const Zeche = require(ZECHE);
    const zeche = new Zeche();
    zeche.loadConfig();
    return zeche.config;
  } finally {
    process.env.PWD = pwd;
    delete require.cache[ZECHE];
  }
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'zeche-config-'));
}

test('zeche.config.js (CommonJS) is loaded as before', () => {
  const config = loadConfigIn(tmpDir(), {
    'zeche.config.js': "module.exports = { environments: { local: {} }, from: 'js' };"
  });
  assert.equal(config.from, 'js');
});

test('zeche.config.cjs wins over zeche.config.js', () => {
  const config = loadConfigIn(tmpDir(), {
    'zeche.config.cjs': "module.exports = { environments: { local: {} }, from: 'cjs' };",
    'zeche.config.js': "module.exports = { environments: { local: {} }, from: 'js' };"
  });
  assert.equal(config.from, 'cjs');
});

test('an ESM default export is unwrapped', { skip: !process.features.require_module && 'needs require(esm)' }, () => {
  const config = loadConfigIn(tmpDir(), {
    'package.json': '{ "type": "module" }',
    'zeche.config.js': "export default { environments: { local: {} }, from: 'esm' };"
  });
  assert.equal(config.from, 'esm');
});

test('an error inside zeche.config.cjs is reported, not mistaken for a missing file', () => {
  const exit = process.exit;
  const log = console.log;
  const messages = [];
  process.exit = code => { throw new Error(`exit ${code}`); };
  console.log = m => messages.push(String(m));
  try {
    assert.throws(() => loadConfigIn(tmpDir(), {
      'zeche.config.cjs': "require('zeche-test-not-installed'); module.exports = { environments: {} };",
      'zeche.config.js': "module.exports = { environments: { local: {} }, from: 'js' };"
    }), /exit 1/);
  } finally {
    process.exit = exit;
    console.log = log;
  }
  assert.match(messages.join('\n'), /error loading zeche\.config\.cjs: .*zeche-test-not-installed/);
});
