const util = require('util');
const events = require('events');

var App = function(logger, logFile) {

  process.title = 'PhilipsAir'; // required to restart process at OS level

  var that = this;
  this.logger = logger;
  this.logFile = logFile;

  this.logger.info('PhilipsAir ' + process.env.npm_package_version + ' started');
  this.logger.startLog('philipsair', 'PhilipsAir', this.logFile, 'PhilipsAir started');

  process.on('SIGINT', function() {
    that.logger.info('PhilipsAir try to stop');
    that.exit(0, 'SIGINT');
  });
  process.on('SIGHUP', function() {
    that.exit(0, 'SIGHUP');
  });
  process.on('SIGTERM', function() {
    that.exit(0, 'SIGTERM');
  });
};

util.inherits(App, events.EventEmitter);

App.prototype.exit = function(code, message) {
  this.emit('exit', code);
  this.logger.info('PhilipsAir exit - ' + message);
  this.logger.closeLog(this.logFile);
};

module.exports = App;
