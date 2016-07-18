#!/usr/bin/env node
const
  opts = require('./lib/options'),
  dotenv = require('dotenv'),
  fs = require('fs'),
  path = require('path'),
  cli = require('cli').enable('glob'),
  envFile = path.join(__dirname, '.env'),
  _ = require('./lib/lodash-min'),
  main = require('./lib/main');

function loadEnvFromDotEnv() {
  if (fs.existsSync(envFile)) {
    dotenv.load(envFile);
  }
}

function isSetViaCli(options, key) {
  const defaultValue = opts.cliOptions[key][3];
  return options[key] != defaultValue; // on purpose: null / undefined mean the same here
}

function fillMissingOptionsFromEnvironment(options) {
  // prefer order:
  //  cli => environment => defaults
  _.keys(opts.keys).forEach(k => {
    const v = opts.keys[k]
    if (!isSetViaCli(options, v) && process.env[k]) {
      options[v] = process.env[k];
    }
  })
}

cli.parse(opts.cliOptions)

cli.main((args, options) => {
  const startFolder = process.cwd();
  try {
    process.chdir(path.dirname(__filename));
    loadEnvFromDotEnv();
    fillMissingOptionsFromEnvironment(options);
    main(options);
  } catch (e) {
    process.chdir(startFolder);
    throw e;
  }
})