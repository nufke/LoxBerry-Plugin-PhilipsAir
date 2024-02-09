const util = require('util');
const events = require('events');

var queue = function() {
  this.q = [];
};

util.inherits(queue, events.EventEmitter);

queue.prototype.push = function(cmd) {
  this.q.push(cmd);
  if (this.q.length==1) {
    this.emit('next', this.q);
  }
}

queue.prototype.get = function() {
  return this.q[0];
}

queue.prototype.empty = function() {
  return (this.q.length==0);
}

queue.prototype.next = function() {
  this.q.shift(); // remove first item
  setTimeout( () => this.emit('next', this.q), 500); // consume next item after 500ms
  return true;
}

module.exports = queue;
