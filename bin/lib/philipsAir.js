const coap = require("node-coap-client").CoapClient;
const crypto = require('crypto');
const aesjs = require('aes-js');
const pkcs7 = require('pkcs7');
const util = require('util');
const events = require('events');

var philipsAir = function(device, logger) {
  this.SECRET_KEY = "JiangPan";
  this.statuspath = '/sys/dev/status';
  this.syncpath = '/sys/dev/sync';
  this.controlpath = '/sys/dev/control';
  this.msgCounter = "";
  this.observe = true;
  this.ipAddress = device.ipAddress;
  this.topic = device.mqtt;
  this.urlPrefix = "coap://" + device.ipAddress + ":5683";
  this.logger = logger;

  this.logger.info("Connect to Philips Air at " + this.ipAddress);

  this.state = {}; // store current observations

  if (this.ipAddress.length != 0) {
    // Connect and observe
    this.syncAndObserve();
  } else {
    this.logger.error("IP address not configured.");
  }
};

util.inherits(philipsAir, events.EventEmitter);

// Return registered MQTT topic
philipsAir.prototype.getTopic = function() {
  return this.topic;
}

// Function to connect and sync to device and than start observing the device
philipsAir.prototype.syncAndObserve = function() {
  let that = this;
  
  // Internal function to split response into separate MQTT messages
  function splitMqttMessages(resp) {
    Object.keys(resp).forEach( key => {
      // only publish changed values
      if (resp[key] != that.state[key]) {
        that.emit('observation_air', that.topic + "/" + key, resp[key]);
      }
    });
  }

  // Internal function to be called by the coap client on receiving a response by observing the device
  // This function will handle the message and decrypt/parse the payload
  function gotObserveResponse(input) {
    const response = input.payload.toString('utf-8');
    const unencryptedResponse = decryptPayload(response);
      if (unencryptedResponse !== "") {
      const jsonstring = unencryptedResponse.replace(/[\u0000-\u0019]+/g, "");
      const json = JSON.parse(jsonstring);
      const resp = json.state.reported;
      that.logger.debug('Observed response: ' + JSON.stringify(resp));
      splitMqttMessages(resp);
      that.state = resp; // keep track of current state
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
    // Sync device to connect
    this.syncDevice().then( () => {
      // Start observing
      coap.observe(
        url = this.urlPrefix + this.statuspath,
        method = "get", gotObserveResponse, "",
        options = { keepAlive: true, confirmable: false }
      ).then(() => {
        this.logger.info("Observation of " + this.ipAddress + " started.");
      }).catch(() => {
        this.logger.error("Error while observing");
      });
    }).catch((error) => {
      this.logger.error("Observing Philips Air failed with error " + error);
    });
  }
};

// Function to sync device
philipsAir.prototype.syncDevice = function () {
  return new Promise((resolve, reject) => {
    const token = crypto.randomBytes(32).toString('hex').toUpperCase();

    // Stop observing
    coap.stopObserving(this.urlPrefix + this.statuspath);
    // Reset connection
    coap.reset(this.urlPrefix);
    // Sync Request
    coap.request(
      url = this.urlPrefix + this.syncpath,
      method = "post",
      payload = Buffer.from(token, 'utf-8'),
      options = { keepAlive: true, confirmable: true, retransmit: true })
      .then(response => {
        this.logger.debug("Philips Air sync response received");
        try {
          this.msgCounter = response.payload.toString('utf-8');
        } catch (err) {
          this.logger.error("Philips Air msg counter corrupt. : " + err);
        }
        resolve();
      })
      .catch(err => {
        this.msgCounter = "";
        this.logger.error("Disconnected, Philips Air could not sync. : " + err);
        reject("Sync request failed.");
      })
  })
};

// Function to handle commands/settings to the device
philipsAir.prototype.sendDeviceCommand = function (commandIn, value) {
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

  if (!availCommands.includes(commandIn.toLowerCase())) {
    this.logger.error("Command not found.");
    return;
  }

  const command = commandIn.toLowerCase();
  let commandValue = value.toString().toLowerCase();

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

  // Stop observing to send command
  coap.stopObserving(this.urlPrefix + this.statuspath);

  // Sync and then send command
  this.syncDevice().then(() => {
    const unencryptedPayload = JSON.stringify(message);
    const encryptedPayload = encryptPayload(unencryptedPayload);

    coap.request(
      url = this.urlPrefix + this.controlpath,
      method = "post", payload = Buffer.from(encryptedPayload),
      options = { keepAlive: true, confirmable: true })
      .then(response => {
        if (response.payload) {
          const payload = response.payload.toString('utf-8');
          this.logger.debug("Command response payload: " + payload);
        } else {
          this.logger.error("Command response invalid: " + err);
        }
        this.syncAndObserve();
      }).catch(err => {
        this.logger.error("Command failed to transmit: " + err);
        this.syncAndObserve();
      });
  }).catch(err => {
    this.logger.error("Philips Air failed to sync, Command failed to transmit: " + err);
    this.syncAndObserve();
  });

};

module.exports = philipsAir;
