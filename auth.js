var util = require('util');
var EventEmitter = require('events').EventEmitter;

Auth = function() {
    this.counter = 0;
};

util.inherits(Auth, EventEmitter);

Auth.prototype.login = function(data, callback) {

    if (data.login == "admin" && data.password == "admin") {
        this.counter++;
        this.emit("login", {
            count: this.counter
        });
        callback(null, {
            "res": "login ok"
        });
    } else {
        callback({
            "res": "login fail"
        }, null);
    }

};

module.exports = exports = Auth;
