var assert = require("assert");

var Amoeba = require("amoeba.io");
var AmoebaLocalClient = require("amoeba.io-local-client");
var AmoebaSocketClient = require("amoeba.io-socket-client");
var AmoebaSocketServer = require("amoeba.io-socket-server");

var Auth = require("../auth");

var server2_amoeba = new Amoeba();
server2_amoeba.path("deep").as(new AmoebaLocalClient({
    login: function(data, callback) {
        callback(null, "deepest");
        this.emit("up", {
            count: 5
        });
    }
}));
new AmoebaSocketServer(server2_amoeba, {
    port: "8091"
});

//Start socket server
var port = "8090";
var server_amoeba = new Amoeba();
server_amoeba.path("auth").as(new AmoebaLocalClient(new Auth()));
server_amoeba.path("auth_with_middleware").as(new AmoebaLocalClient(new Auth()));

server_amoeba.path("auth_interrupted").as(new AmoebaLocalClient(new Auth()));
server_amoeba.path("auth_interrupted").use("before_invoke", function(context, next) {
    context.response.result = null;
    context.response.error = "interrupted";
    next(false);
});

server_amoeba.path("auth_before_event").as(new AmoebaLocalClient(new Auth()));
server_amoeba.path("auth_before_event").use("before_event", function(context, next) {
    context.event.data.count = 7;
    next();
});

server_amoeba.path("auth_before_event_interrupted").as(new AmoebaLocalClient(new Auth()));
server_amoeba.path("auth_before_event_interrupted").use("before_event", function(context, next) {
    next(false);
});

server_amoeba.path("deep").as(new AmoebaSocketClient({
    url: "http://localhost:8091"
}));
new AmoebaSocketServer(server_amoeba, {
    port: port
});


describe('Complex invoke tests', function() {
    var amoeba;

    beforeEach(function() {

    });

    it('#invoke', function(done) {
        var client_amoeba = new Amoeba();

        client_amoeba.path("auth").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {
            client_amoeba.path("auth").invoke("login", {
                login: 'admin',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
            });
            client_amoeba.path("auth").invoke("login", {
                login: 'admin',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
                done();
            });
        });
    });

    it('#chain invoke', function(done) {
        var client_amoeba = new Amoeba();

        client_amoeba.path("deep").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {
            client_amoeba.path("deep").invoke("login", {
                login: 'admin',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data, "deepest");
                done();
            });
        });
    });

    it('#midlleware call test', function(done) {
        var client_amoeba = new Amoeba();
        var c = 0;

        server_amoeba.path("auth_with_middleware").use("before_invoke", function(context, next) {
            assert.equal(context.request.params.login, "adminno");
            context.request.params.login = "admin";
            c = c + 1;
            next();
        });
        server_amoeba.path("*").use("before_invoke", function(context, next) {
            c = c + 1;
            next();
        });

        client_amoeba.path("auth_with_middleware").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {
            client_amoeba.path("auth_with_middleware").invoke("login", {
                login: 'adminno',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
                assert.equal(c, 2);
                done();
            });
        });
    });

    it('#midlleware interrupt test', function(done) {
        var client_amoeba = new Amoeba();

        client_amoeba.path("auth_interrupted").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {
            client_amoeba.path("auth_interrupted").invoke("login", {
                login: 'admin',
                password: 'admin'
            }, function(err, data) {
                assert.equal(err, "interrupted");
                done();
            });
        });
    });
});
describe('Complex events test', function() {
    var amoeba;

    beforeEach(function() {

    });

    it('#basic events', function(done) {
        var client_amoeba = new Amoeba();

        client_amoeba.path("auth").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {

            client_amoeba.path("auth").on("login", function(data) {
                assert.equal(data.count, 3);
                client_amoeba.removeAllListeners();
                done();
            });

            client_amoeba.path("auth").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
            });
        });

    });

    it('#mask events', function(done) {
        var client_amoeba = new Amoeba();

        client_amoeba.path("auth").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {
            client_amoeba.on("*", "*", function(data) {
                assert.equal(data.count, 3);
                client_amoeba.removeAllListeners();
                //client_amoeba = null;
                done();
            });

            client_amoeba.path("auth").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
            });
        });
    });

    it('#middleware events', function(done) {
        var client_amoeba = new Amoeba();

        client_amoeba.path("auth_before_event").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {
            client_amoeba.path('auth_before_event').on("unknown", function(data, event, path) {
                assert.ok(false);
            });

            client_amoeba.path('auth_before_event').on("*", function(data, event, path) {
                assert.equal(data.count, 7);
                assert.equal(event, "login");
                assert.equal(path, "auth_before_event");
                client_amoeba.removeAllListeners();
                //client_amoeba = null;
                done();
            });

            client_amoeba.path("auth_before_event").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
            });
        });
    });

    it('#middleware events interrupted', function(done) {
        var client_amoeba = new Amoeba();

        client_amoeba.path("auth_before_event_interrupted").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {
            client_amoeba.path('auth_before_event_interrupted').on("*", function(data, event, path) {
                assert.ok(false);
            });

            client_amoeba.path("auth_before_event_interrupted").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data.res, "login ok");
                setTimeout(function() {
                    done();
                }, 100);
            });
        });
    });

    it('#chain socket events', function(done) {
        var client_amoeba = new Amoeba();

        client_amoeba.path("deep").as(new AmoebaSocketClient({
            url: "http://localhost:8090"
        }), function() {

            client_amoeba.path('deep').on("up", function(data) {
                assert.equal(data.count, 5);
                client_amoeba.removeAllListeners();
                //client_amoeba = null;
                done();
            });

            client_amoeba.path("deep").invoke("login", {
                "login": "admin",
                "password": "admin"
            }, function(err, data) {
                assert.equal(err, null);
                assert.equal(data, "deepest");
            });
        });

    });
});
