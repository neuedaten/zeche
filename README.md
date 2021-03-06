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

- config file in your project root: *zeche.config.js*
- config file examples: coming soon
- better put all passwords, keys and other secret stuff to a .env file

## Hooks

Every action runs two hooks: `before`, `after`.
More will follow in the future

### under the hood

- zeche based on Node.js.

# Licence

(The MIT License)

Copyright (c) 2019 Bastian Schwabe <bas@neuedaten.de>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.