#!/usr/bin/env node

const directories = require('./lib/directories');
const Logger = require('loxberry-logger');
const App = require('./lib/App');
const MqttClient = require('./lib/mqttClient.js');
const PhilipsAir = require('./lib/philipsAir.js');

const configFile = `${directories.config}/config.json`;
const logFile = `${directories.logdir}/philipsair.log`;
const globalConfigFile = `${directories.system_config}/general.json`;
const globalPluginDbFile = `${directories.system_data}/plugindatabase.json`;
const syslogDbFile = `${directories.syslogdir}/logs_sqlite.dat`;

const getPluginLogLevel = () => {
  let globalPluginDb = require(globalPluginDbFile);
  const pluginData = Object.values(globalPluginDb.plugins).find( (entry) => entry.name === 'philipsair');
  if (!pluginData) return 3; // not defined defaults to ERROR level
  return Number(pluginData.loglevel);
};

const main = () => {
  let config = require(configFile);
  let globalConfig = require(globalConfigFile);
  let logLevel = getPluginLogLevel();
  let devices = [ ...config.devices];

  const logger = new Logger(syslogDbFile, logLevel);
  const app = new App(logger, logFile);
  const mqttClient = new MqttClient(globalConfig, app);

  if (!(config && config.devices)) {
    logger.error("Missing or illegal configuration. Reinstall the plugin or report this issue.");
    return;
  }

  const philipsAir = new PhilipsAir(devices, logger);

  mqttClient.subscribe(devices.map( item => item.mqtt + "/cmd/#"));

  mqttClient.on('message', function(topic, message, packet) {
    const device = devices.find(item => topic.includes(item.mqtt));
    if (message.length && device) {
      let resp = message.toString();
      const items = topic.split("/");
      const command = items[items.length-1]; // select last item
      logger.debug('Command received via MQTT:' + command + ' ' + resp);
      philipsAir.sendCommand(device.ipAddress, { command: command, value: resp });
    }
  });

  philipsAir.on('observation', function(topic, value) {
    let payload = String(value);
    let options = { retain: true, qos: 1 };
    let fixedTopicName = topic.replace('+', '_').replace('#', '_')
    logger.debug('Publish topic: ' + topic + ', payload: ' + payload);
    mqttClient.publish(fixedTopicName, payload, options);
  });

};

main();
