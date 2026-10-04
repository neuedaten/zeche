++ under construction ++

# zeche

zeche is a CLI software project handling tool.
- File deployment
- DB deployment
- Dump DB
- …

## Actions

### Deploy

``zeche deploy <what> <exactly> <from> <to>``

#### Deploy files

``zeche deploy files <exactly> <from> <to>``

#### Deploy database

``zeche deploy database <exactly> <from> <to>``

### Backup

#### List
``zeche backup list <where>``

#### Create file backup
``zeche backup files <what> <where>``

#### Create database backup
``zeche backup db all <where>``

#### Rollback 
``zeche backup rollback <id> <where>``

#### rm 
``zeche backup rm <id> <where>``


### Dump

``zeche dump <import/export> <what> <where>``

### SSH

``zeche ssh <where>``

### Browser

``zeche browser <where>``

## Configuration

- config file in your project root: *zeche.config.js*, or *zeche.config.cjs* in a project with `"type": "module"` (Vite): there a `.js` file is an ES module and cannot use `module.exports`
- config file examples: coming soon
- better put all passwords, keys and other secret stuff to a .env file

### rsync parameters

By default zeche copies files with `rsync -r --links`. An environment can set its own flags with
`rsyncParameters` (string or array). They apply when files are copied **to** that environment
(deploy, restore) and when they are copied **from** it (backup from a server). Typical use: a
project that is deployed as a whole directory and must not carry its local state along.

```js
live: {
  ssh: { host: '…', user: '…', key: process.env.LIVE_SSH_KEY, params: '-o IdentitiesOnly=yes' },
  // -a keeps symlinks, --delete removes what is gone locally, excludes keep local state at home
  rsyncParameters: '-az --delete --exclude=/.env --exclude=/storage --exclude=/node_modules',
  paths: { app: '/var/www/app/incoming/' }
}
```

`rsyncParameters` replaces the default flags completely, so include `-r` or `-a` yourself.
(Older configurations may contain `ssh.rsyncParams`; that key was never read and still is not.)

## Hooks

Every action runs two hooks: `before`, `after`. For a file deployment they live next to the
paths of the set and receive `(config, services, {what, exactly, from, to})`:

```js
sets: {
  deploy: {
    files: {
      app: {
        ways: [['local', 'live']],
        paths: ['app'],
        before: (config, services, params) => { /* build, check */ },
        after:  (config, services, params) => { /* print what to run on the server */ }
      }
    }
  }
}
```

A hook that throws stops the action. More hooks will follow in the future.

### under the hood

- zeche based on Node.js.

# Licence

(The MIT License)

Copyright (c) 2019 Bastian Schwabe <bas@neuedaten.de>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.