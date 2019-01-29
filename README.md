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

### Dump

``zeche dump <what> <where>``

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