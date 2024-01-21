#!/usr/bin/env node

const fs = require('fs');
const configFile = process.env.LBPCONFIG + '/philipsair/config.json';
let config;

try {
  const configData = fs.readFileSync(configFile);
  config = JSON.parse(configData);
} catch (err) {
  console.error(err);
}

update_config(config);

function update_config(config) {
  console.log('Update Philips Air configuration...');
  if (!config)
    config = {};

  if (!config.mqtt) {
    config['devices'] = [];
  }

  fs.writeFileSync(configFile, JSON.stringify(config));
}
