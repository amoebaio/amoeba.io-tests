var assert = require("assert");

var Amoeba = require("amoeba.io");
var AmoebaLocalClient = require("amoeba.io-local-client");
var AmoebaSocketClient = require("amoeba.io-socket-client");
var AmoebaSocketServer = require("amoeba.io-socket-server");

var SocketServer = require('socket.io');
var SocketClient = require('socket.io-client');

var Auth = require("../auth");

var server2_amoeba = new Amoeba();
var server2 = new SocketServer();
server2_amoeba.use("deep", new AmoebaLocalClient(new Auth()));
server2.listen("8091").on('connection', function(socket) {
    socket.on('error', function() {
        console.log("Server socket error");
        console.log(arguments);
    });
    server2_amoeba.server(new AmoebaSocketServer(socket));
});


//Start socket server
var port = "8090";
server_amoeba = new Amoeba();
server_amoeba.use("auth", new AmoebaLocalClient(new Auth()));
server_amoeba.use("auth2", new AmoebaLocalClient(new Auth()));
var socket = new SocketClient('http://localhost:8091', {
    forceNew: true,
    reconnection: false
});

socket.on('connect', function() {
    server_amoeba.use("deep", new AmoebaSocketClient(socket));
});



server = new SocketServer();
server.listen(port).on('connection', function(socket) {
    socket.on('error', function() {
        console.log("Server socket error");
        console.log(arguments);
    });
    server_amoeba.server(new AmoebaSocketServer(socket));
});


describe('Complex test', function() {
    var amoeba;

    beforeEach(function() {

    });

    it('#invoke', function(done) {
        var client_amoeba = new Amoeba();

        var socket = new SocketClient('http://localhost:' + port, {
            forceNew: true,
            reconnection: false
        });

        socket.on('connect', function() {
            client_amoeba.use("auth", new AmoebaSocketClient(socket));
            client_amoeba.use("auth").invoke("login", {
                login: 'admin',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
            });
            client_amoeba.use("auth").invoke("login", {
                login: 'admin',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
                socket.close();
                done();
            });
        });
    });

    it('#local events', function(done) {
    var c = 0;
    var f = function(data) {
        assert.equal(data.count, 3);
        c++;
        if (c > 1) {
            assert.ok(false);
        }
    };
    server_amoeba.use("auth").on("login", f, function() {
        server_amoeba.use("auth").invoke("login", {
            "login": "admin",
            "password": "admin"
        }, function(err, data) {
            assert.equal(err, null);
            assert.equal(data.res, "login ok");

            server_amoeba.use("auth").removeListener("login", f, function() {
                server_amoeba.use("auth").invoke("login", {
                    "login": "admin",
                    "password": "admin"
                }, function() {
                    done();
                });
            });

        });
    });
});

it('#socket events', function(done) {
    var client_amoeba = new Amoeba();

    var c = 0;
    var f = function(data) {
        assert.equal(data.count, 5);

        c++;
        if (c > 1) {
            assert.ok(false);
        }
    };

    var socket = new SocketClient('http://localhost:' + port, {
        forceNew: true,
        reconnection: false
    });

    socket.on('connect', function() {
        client_amoeba.use("auth", new AmoebaSocketClient(socket));
        client_amoeba.use("auth2", new AmoebaSocketClient(socket));

        client_amoeba.use("auth").on("some", function(data) {
            assert.ok(false);
        });

        client_amoeba.use("auth2").on("login", function(data) {
            assert.ok(false);
        });

        client_amoeba.use("auth").on("login", f, function(err, data) {
            client_amoeba.use("auth").invoke("login", {
                login: 'admin',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");

                client_amoeba.use("auth").removeListener("login", f, function() {
                    client_amoeba.use("auth").invoke("login", {
                        "login": "admin",
                        "password": "admin"
                    }, function() {
                        done();
                    });
                });
            });
        });
    });

});

it('#chain socket events', function(done) {
    var client_amoeba = new Amoeba();

    var c = 0;
    var f = function(data) {
        assert.equal(data.count, 1);

        c++;
        if (c > 1) {
            assert.ok(false);
        }
    };

    var socket = new SocketClient('http://localhost:' + port, {
        forceNew: true,
        reconnection: false
    });

    socket.on('connect', function() {
        client_amoeba.use("deep", new AmoebaSocketClient(socket));

        client_amoeba.use("deep").on("some", function(data) {
            assert.ok(false);
        });

        client_amoeba.use("deep").on("login", f, function(err, data) {
            client_amoeba.use("deep").invoke("login", {
                login: 'admin',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");

                client_amoeba.use("deep").removeListener("login", f, function() {
                    client_amoeba.use("deep").invoke("login", {
                        "login": "admin",
                        "password": "admin"
                    }, function() {
                        done();
                    });
                });
            });

        });
    });

});



});
