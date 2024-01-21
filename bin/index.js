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

  // add field to store instance and subscribe each device to receive MQTT messages 
  devices.forEach( device => {
    device['inst'] = null;
    mqttClient.subscribe(device.mqtt);
  });

  //console.log('devices', devices);
  const logger = new Logger(syslogDbFile, logLevel);
  const app = new App(logger, logFile);
  const mqttClient = new MqttClient(globalConfig, app);

  if (!(config && config.devices)) {
    logger.error('Missing or illegal configuration. Reinstall the plugin or report this issue.');
    return;
  }
 
  mqttClient.subscribe('test');

  mqttClient.on('message', function(topic, message, packet) {
    if (message.length && devices.filter( item => item.mqtt)) {
      let resp = JSON.parse(message.toString());
      publishTopic(topic, resp);
    }
  });

  function publishTopic(topic, data) {
    let payload = String(data);
    let options = { retain: true, qos: 1 };
    logger.debug('Publish topic: ' + topic + ', payload: ' + payload);
    var fixedTopicName = topic.replace('+', '_').replace('#', '_')
    mqttClient.publish(fixedTopicName, payload, options);
  };

  devices.forEach( device => {
    if (device.ipAddress && device.mqtt) {
      logger.info("Registered Philips Air device with IP address " + device.ipAddress);
      device.inst = new PhilipsAir(device, logger);
      device.inst.on('publishObs', function(topic, value) {
        publishTopic(topic,value);
      });
    } else {
      logger.info("Philips Air - Device " + device.ipAddress + ' not registered.');
    }
  });
};

main();
