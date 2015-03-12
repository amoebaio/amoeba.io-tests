var assert = require("assert");

var Amoeba = require("amoeba.io");
var AmoebaLocalClient = require("amoeba.io-local-client");
var AmoebaSocketClient = require("amoeba.io-socket-client");
var AmoebaSocketServer = require("amoeba.io-socket-server");

var SocketServer = require('socket.io');
var SocketClient = require('socket.io-client');

var Auth = require("../auth");


//Start socket server
var port = "8090";
server_amoeba = new Amoeba();
server_amoeba.use("auth", new AmoebaLocalClient(new Auth()));
server = new SocketServer();
server.listen(port).on('connection', function(socket) {
    socket.on('error', function() {
        console.log("Server socket error");
        console.log(arguments);
    });
    server_amoeba.server(new AmoebaSocketServer(socket));
});


describe('Handlers test', function() {
    var amoeba;
    var tester;
    beforeEach(function() {
        tester = {
            first_handler: false,
            second_handler: false
        };
    });

    it('#before_invoke', function(done) {
        server_amoeba.use("auth").handler("before_invoke", function(context, next) {
            assert.equal(context.request.use, "auth");
            assert.equal(context.request.method, "login");
            assert.equal(context.request.params.login, "admin");
            assert.equal(context.request.params.password, "admin");
            tester.first_handler = true;
            next();
        });

        server_amoeba.use("auth").handler("before_invoke", function(context, next) {
            tester.second_handler = true;
            next();
        });


        var client_amoeba = new Amoeba();

        var socket = new SocketClient('http://localhost:' + port, {
            forceNew: true,
            reconnection: false
        });

        socket.on('connect', function() {
            client_amoeba.use("auth", new AmoebaSocketClient(socket));
            client_amoeba.use("auth").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, result) {
                assert.equal(result.res, "login ok");
                assert.ok(tester.first_handler);
                assert.ok(tester.second_handler);
                server_amoeba.use("auth").handlers_list.before_invoke = [];
                done();
            });
        });
    });

    it('#before_invoke interrupted', function(done) {
        server_amoeba.use("auth").handler("before_invoke", function(context, next) {
            assert.equal(context.request.use, "auth");
            assert.equal(context.request.method, "login");
            assert.equal(context.request.params.login, "admin");
            assert.equal(context.request.params.password, "admin");
            tester.first_handler = true;
            context.response.error = {
                "message": "Login fail"
            };
            next(false);
        });

        server_amoeba.use("auth").handler("before_invoke", function(context, next) {
            tester.second_handler = true;
            next();
        });


        var client_amoeba = new Amoeba();

        var socket = new SocketClient('http://localhost:' + port, {
            forceNew: true,
            reconnection: false
        });

        socket.on('connect', function() {
            client_amoeba.use("auth", new AmoebaSocketClient(socket));
            client_amoeba.use("auth").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, result) {
                assert.equal(err.message, "Login fail");
                assert.ok(tester.first_handler);
                assert.equal(tester.second_handler, false);
                server_amoeba.use("auth").handlers_list.before_invoke = [];
                done();
            });
        });
    });


    it('#after_invoke', function(done) {
        server_amoeba.use("auth").handler("after_invoke", function(context, next) {
            assert.equal(context.response.result.res, "login ok");
            tester.first_handler = true;
            context.response.result.first_add = true;
            next();
        });

        server_amoeba.use("auth").handler("after_invoke", function(context, next) {
            assert.ok(context.response.result.first_add);
            tester.second_handler = true;
            context.response.result.res = "Translated: login ok";
            context.response.result.second_add = true;
            next();
        });


        var client_amoeba = new Amoeba();

        var socket = new SocketClient('http://localhost:' + port, {
            forceNew: true,
            reconnection: false
        });

        socket.on('connect', function() {
            client_amoeba.use("auth", new AmoebaSocketClient(socket));
            client_amoeba.use("auth").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, result) {
                assert.equal(result.res, "Translated: login ok");
                assert.ok(result.first_add);
                assert.ok(result.second_add);
                assert.ok(tester.first_handler);
                assert.ok(tester.second_handler);
                server_amoeba.use("auth").handlers_list.after_invoke = [];
                done();
            });
        });
    });


    it('#after_invoke interrupted', function(done) {
        server_amoeba.use("auth").handler("after_invoke", function(context, next) {
            assert.equal(context.response.result.res, "login ok");
            tester.first_handler = true;
            context.response.result.first_add = true;
            next(false);
        });

        server_amoeba.use("auth").handler("after_invoke", function(context, next) {
            assert.ok(context.response.result.first_add);
            tester.second_handler = true;
            context.response.result.res = "Translated: login ok";
            context.response.result.second_add = true;
            next();
        });


        var client_amoeba = new Amoeba();

        var socket = new SocketClient('http://localhost:' + port, {
            forceNew: true,
            reconnection: false
        });

        socket.on('connect', function() {
            client_amoeba.use("auth", new AmoebaSocketClient(socket));
            client_amoeba.use("auth").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, result) {
                assert.equal(result.res, "login ok");
                assert.ok(result.first_add);
                assert.ok(tester.first_handler);
                assert.equal(tester.second_handler, false);
                server_amoeba.use("auth").handlers_list.after_invoke = [];
                done();
            });
        });
    });

    it('#before_invoke + after_invoke', function(done) {
        server_amoeba.use("auth").handler("before_invoke", function(context, next) {
            tester.first_handler = true;
            context.request.first_add = true;
            next();
        });

        server_amoeba.use("auth").handler("after_invoke", function(context, next) {
            assert.equal(context.response.result.res, "login ok");
            assert.ok(context.request.first_add);
            tester.second_handler = true;
            context.response.result.res = "Translated: login ok";
            context.response.result.second_add = true;
            next();
        });


        var client_amoeba = new Amoeba();

        var socket = new SocketClient('http://localhost:' + port, {
            forceNew: true,
            reconnection: false
        });

        socket.on('connect', function() {
            client_amoeba.use("auth", new AmoebaSocketClient(socket));
            client_amoeba.use("auth").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, result) {
                assert.equal(result.res, "Translated: login ok");
                assert.ok(result.second_add);
                assert.ok(tester.first_handler);
                assert.ok(tester.second_handler);
                server_amoeba.use("auth").handlers_list.before_invoke = [];
                server_amoeba.use("auth").handlers_list.after_invoke = [];
                done();
            });
        });
    });

    it('#before_event', function(done) {
        server_amoeba.use("auth").handler("before_event", function(context, next) {
            assert.equal(context.event.use, "auth");
            assert.equal(context.event.event, "login");
            context.event.data.add_first = true;
            next();
        });

        server_amoeba.use("auth").handler("before_event", function(context, next) {
            assert.equal(context.event.use, "auth");
            assert.equal(context.event.event, "login");
            assert.ok(context.event.data.add_first);
            context.event.data.add_second = true;
            next();
        });

        var client_amoeba = new Amoeba();

        var socket = new SocketClient('http://localhost:' + port, {
            forceNew: true,
            reconnection: false
        });

        socket.on('connect', function() {
            client_amoeba.use("auth", new AmoebaSocketClient(socket));
            client_amoeba.use("auth").on("login", function(event) {
                assert.ok(event.add_first);
                assert.ok(event.add_second);
                server_amoeba.use("auth").handlers_list.before_invoke = [];
                done();
            }, function() {
                client_amoeba.use("auth").invoke("login", {
                    "login": "admin",
                    "password": "admin"
                }, function(err, result) {
                    assert.equal(result.res, "login ok");
                });
            });
        });
    });

    it('#before_event interrupted', function(done) {
        server_amoeba.use("auth").handler("before_event", function(context, next) {
            assert.equal(context.event.use, "auth");
            assert.equal(context.event.event, "login");
            context.event.data.add_first = true;
            next(false);
        });

        server_amoeba.use("auth").handler("before_event", function(context, next) {
            assert.ok(false);
            next();
        });

        var client_amoeba = new Amoeba();

        var socket = new SocketClient('http://localhost:' + port, {
            forceNew: true,
            reconnection: false
        });

        socket.on('connect', function() {
            client_amoeba.use("auth", new AmoebaSocketClient(socket));
            client_amoeba.use("auth").on("login", function(event) {
                assert.ok(false);
            }, function() {
                client_amoeba.use("auth").invoke("login", {
                    "login": "admin",
                    "password": "admin"
                }, function(err, result) {
                    assert.equal(result.res, "login ok");
                    done();
                });
            });
        });
    });
});
