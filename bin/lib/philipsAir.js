const crypto = require('crypto');
const aesjs = require('aes-js');
const pkcs7 = require('pkcs7');
const util = require('util');
const events = require('events');
const coap = require("node-coap-client").CoapClient;
const Queue = require('./queue');

var philipsAir = function(devices, logger) {
  this.devices = devices;
  this.logger = logger;
  this.SECRET_KEY = "JiangPan";
  this.statuspath = '/sys/dev/status';
  this.syncpath = '/sys/dev/sync';
  this.controlpath = '/sys/dev/control';
  this.msgCounter = "";
  this.observe = true;
  let that = this;
  const q = new Queue();
  this.q = q;

  this.devices.forEach( (device, index) => {
    if (!device.ipAddress) {
      this.logger.error("IP address not configured for device " + (index+1));
      return
    }
    device['state'] = {}; // store state of device
    device['urlPrefix'] = "coap://" + device.ipAddress + ":5683";
    this.logger.info("Connect to Philips Air at " + device.ipAddress);
    this.syncAndObserve(device);
  });

  q.on('next', function(e) {
    if (!q.empty()) {
      let a = q.get();
      that.sendDeviceCommand(a.device, a.command);
    }
  });

};

util.inherits(philipsAir, events.EventEmitter);

philipsAir.prototype.sendCommand = function(ipAddress, command) {
  const device = this.devices.find(item => item.ipAddress == ipAddress);
  this.q.push({ device: device, command: command });
}

// Function to connect and sync to device and than start observing the device
philipsAir.prototype.syncAndObserve = function(device) {
  let that = this;
  
  // Internal function to split response into separate MQTT messages
  function splitMqttMessages(device, resp) {
    Object.keys(resp).forEach( key => {
      // only publish changed values
      if (resp[key] != device.state[key]) {
        that.emit('observation', device.mqtt + "/" + key, resp[key]);
      }
    });
  }

  // Internal function to be called by the coap client on receiving a response by observing the device
  // This function will handle the message and decrypt/parse the payload
  function gotObserveResponse(device, input) {
    const response = input.payload.toString('utf-8');
    const unencryptedResponse = decryptPayload(response);
      if (unencryptedResponse !== "") {
      const jsonstring = unencryptedResponse.replace(/[\u0000-\u0019]+/g, "");
      const json = JSON.parse(jsonstring);
      const resp = json.state.reported;
      that.logger.debug('Observed response: ' + JSON.stringify(resp));
      splitMqttMessages(device, resp);
      device.state = resp; // keep track of current state
    }
  }

  // Internal function to decrypt the message payload
  function decryptPayload(payload_encrypted) {
    const pe_length = payload_encrypted.length;
    const key = payload_encrypted.substring(0, 8);
    const ciphertext = payload_encrypted.substring(8, pe_length - 64);
    const digest = payload_encrypted.substring(pe_length - 64);
    const digest_calculated = crypto.createHash('sha256').update(key + ciphertext).digest("hex").toUpperCase();

    if (digest == digest_calculated) {
      const key_and_iv = crypto.createHash('md5').update(Buffer.from((that.SECRET_KEY + key), 'utf-8')).digest("hex").toUpperCase();
      const half_keylen = key_and_iv.length / 2;
      const secret_key = key_and_iv.substring(0, half_keylen);
      const iv = key_and_iv.substring(half_keylen);
      const decipher = new aesjs.ModeOfOperation.cbc(Buffer.from(secret_key, 'utf-8'), Buffer.from(iv, 'utf-8'));
      const data = decipher.decrypt(Buffer.from(ciphertext, 'hex'));
      const plaintext = aesjs.utils.utf8.fromBytes(data);
      return plaintext;
    } else {
      that.logger.debug("Philips Air decryption calculated digest mismatch");
      return "";
    }
  };

  if (this.observe) {
    this.syncDevice(device).then(() => {
      // Start observing
      coap.observe(
        url = device.urlPrefix + this.statuspath,
        method = "get", (resp) => gotObserveResponse(device, resp), "",
        options = { keepAlive: true, confirmable: false }
      ).then( () => {
        this.logger.info("Observation of device " + device.ipAddress + " started.");
        this.q.next(); // process next command if available
      }).catch( (error) => {
        this.logger.error("Error while observing of device " + device.ipAddress + ', error: ' + error);
      });
    }).catch((error) => {
      this.logger.error("Observing Philips Air failed with error " + error);
    });
  }
};

// Function to sync device
philipsAir.prototype.syncDevice = function (device) {
  const timeout = (delay, reason) =>
    new Promise((resolve, reject) =>
      setTimeout( () => 
        (reason === undefined ? resolve() : reject(reason)), delay
      )
    );

  const requestWithTimeout = (promise, delay, reason) =>
    Promise.race([promise, timeout(delay, reason)])

  return new Promise( (resolve, reject) => {
    const token = crypto.randomBytes(32).toString('hex').toUpperCase();

    // Stop observing
    coap.stopObserving(device.urlPrefix + this.statuspath);
    this.logger.info("Observation of " + device.ipAddress + " stopped.");

    // Reset connection
    coap.reset(device.urlPrefix);

    // Sync Request
    requestWithTimeout( 
      coap.request(
        url = device.urlPrefix + this.syncpath,
        method = "post",
        payload = Buffer.from(token, 'utf-8'),
        options = { keepAlive: true, confirmable: true, retransmit: false }
      ), 1000, 'COAP request timeout'
    ).then(response => {
      this.logger.debug("Philips Air sync response received");
      try {
        this.msgCounter = response.payload.toString('utf-8');
      } catch (err) {
        this.logger.error("Philips Air msg counter corrupt. : " + err);
      }
      resolve("OK");
    }).catch(err => {
      this.msgCounter = "";
      this.logger.error("Disconnected, Philips Air could not sync. : " + err);
      reject("Sync request failed.");
    });
  });
};

// Function to handle commands/settings to the device
philipsAir.prototype.sendDeviceCommand = function (device, commandIn) {
  let that = this;
  const availCommands = ["aqil", "cl", "dt", "func", "mode", "om", "pwr", "rhset", "uil"]; // TODO more commands?

  // Internal function to encrypt the message payload
  function encryptPayload(unencryptedPayload) {
    // Increase and encode msg counter
    increaseCounter();
    const key_and_iv = new crypto.createHash('md5').update(that.SECRET_KEY + that.msgCounter).digest('hex').toUpperCase();
    const key = key_and_iv.substring(0, key_and_iv.length / 2);
    const iv = key_and_iv.substring(key_and_iv.length / 2, key_and_iv.length);
    const data = pkcs7.pad(aesjs.utils.utf8.toBytes(unencryptedPayload));
    let cipher = new aesjs.ModeOfOperation.cbc(Buffer.from(key, 'utf-8'), Buffer.from(iv, 'utf-8'));
    let encryptedBytes = Buffer.from(cipher.encrypt(data)).toString('hex').toUpperCase();
    const hash = Buffer.from(crypto.createHash('sha256').update(that.msgCounter + encryptedBytes).digest('hex').toUpperCase());
    return that.msgCounter + encryptedBytes + hash;
  };

  // Internal method to increase counter and convert back to hex big endian.
  function increaseCounter() {
    let inbuffer = Buffer.from(that.msgCounter, 'hex');
    let counterint = inbuffer.readUInt32BE(0) + 1;
    const outbuffer = Buffer.allocUnsafe(4);
    outbuffer.writeUInt32BE(counterint, 0);
    that.msgCounter = outbuffer.toString('hex').toUpperCase();
    return;
  };

  if (!commandIn) {
    this.logger.error("Command empty.");
    return;
  }

  if (!device) {
    this.logger.error("No device given.");
    return;
  }

  if (!availCommands.includes(commandIn.command.toLowerCase())) {
    this.logger.error("Command not found.");
    this.q.next();
    return;
  }

  const command = commandIn.command.toLowerCase();
  let commandValue = commandIn.value.toString().toLowerCase();

  if (commandValue == device.state[command]) {
    this.logger.info("Command " + command + " already set to value " + commandValue + ". Command skipped.");
    this.q.next();
    return;
  }

  // Parse boolean string to boolean
  if (commandValue == "false" || commandValue == "true") {
    commandValue = (commandValue == "true") ? commandValue = true : false;
  }

  if (command == "mode" || command == "func") {
    commandValue = commandValue.toUpperCase();
  }

  if (command == "aqil" || command == "rhset" || command == "dt") {
    commandValue = parseInt(commandValue);
  }

  let message = { state: { desired: { CommandType: 'app', DeviceId: '', EnduserId: '1' } } };
  message.state.desired[command] = commandValue;

  this.logger.debug('send message: '+ JSON.stringify(message));

  // Sync and then send command
  this.syncDevice(device).then(() => {
    const unencryptedPayload = JSON.stringify(message);
    const encryptedPayload = encryptPayload(unencryptedPayload);
    coap.request(
      url = device.urlPrefix + this.controlpath,
      method = "post", payload = Buffer.from(encryptedPayload),
      options = { keepAlive: true, confirmable: true })
      .then(response => {
        if (response.payload) {
          const payload = response.payload.toString('utf-8');
          this.logger.debug("Command response payload: " + payload);
        } else {
          this.logger.error("Command response invalid: " + err);
        }
        this.syncAndObserve(device);
      }).catch(err => {
        this.logger.error("Command failed to transmit: " + err);
        this.syncAndObserve(device);
      });
  }).catch(err => {
    this.logger.error("Philips Air failed to sync, Command failed to transmit: " + err);
    this.syncAndObserve(device);
  })
};

module.exports = philipsAir;
