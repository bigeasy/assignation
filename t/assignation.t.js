require('proof')(6, require('cadence')(prove))

function prove (async, assert) {
    var delta = require('delta')
    var abend = require('abend')
    var http = require('http')
    var Rendezvous = {
        Conduit: require('../rendezvous.conduit'),
        Middleware: require('../rendezvous.middleware')
    }
    var Envoy = {
        Conduit: require('../envoy.conduit'),
        Middleware: require('../envoy.middleware')
    }
    var UserAgent = require('vizsla')
    var ua = new UserAgent
    var Upgrader = require('downgrader')
    var upgrader = new Upgrader
    var sockets = []

    var rendezvous = {
        conduit: null,
        middleware: new Rendezvous.Middleware
    }
    rendezvous.conduit = new Rendezvous.Conduit(rendezvous.middleware, 'upgrade')
    rendezvous.conduit.upgrade({
        headers: {}
    }, {
        destroy: function () {
            assert(true, 'missing protocol identification header')
        }
    }, null)
    upgrader.on('socket', rendezvous.conduit.upgrade.bind(rendezvous.conduit))
    var server = http.createServer(function (request, response) {
        rendezvous.middleware.middleware(request, response, function (error) {
            response.writeHead(error ? 503 : 404, { 'content-type': 'text/plain' })
            response.write('error')
            response.end()
        })
    })
    server.on('upgrade', function (request, socket, head) {
        upgrader.upgrade(request, socket, head)
    })
    async(function () {
        server.listen(8088, '127.0.0.1', async())
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:8088/identifier/hello',
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 404, 'http request')
    }, function () {
        var request = http.request({
            host: '127.0.0.1',
            port: 8088,
            headers: Envoy.Middleware.headers('/identifier', {
                host: '127.0.0.1:8088'
            })
        })
        delta(async()).ee(request).on('upgrade')
        request.end()
    }, function (request, socket, head) {
        var envoy = {
            middleware: new Envoy.Middleware(function (request, response) {
                response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                response.write('Hello, World!')
                response.end()
            }),
            conduit: new Envoy.Conduit
        }
        envoy.middleware.listen(abend)
        envoy.conduit.connect(envoy.middleware.server, request, socket, head, abend)
        async(function () {
            envoy.conduit.ready.wait(async())
        }, function () {
            ua.fetch({
                url: 'http://127.0.0.1:8088/identifier/hello',
                post: {}
            }, async())
        }, function (message) {
            assert(message, 'Hello, World!', 'body')
            envoy.conduit.close()
            envoy.middleware.destroy()
            setTimeout(async(), 250)
        }, function () {
            rendezvous.middleware.destroy()
            rendezvous.conduit.destroy()
        }, function () {
            server.close(async())
        }, function () {
            rendezvous.conduit.upgrade(null, {
                destroy: function () {
                    assert(true, 'was destroyed')
                }
            }, null)
        })
    }, function () {
        upgrader = new Upgrader
        rendezvous = {
            conduit: null,
            middleware: new Rendezvous.Middleware
        }
        rendezvous.conduit = new Rendezvous.Conduit(rendezvous.middleware, 'upgrade')
        upgrader.on('socket', rendezvous.conduit.upgrade.bind(rendezvous.conduit))
        server = http.createServer(function (request, response) {
            rendezvous.middleware.middleware(request, response, function (error) {
                response.writeHead(error ? 503 : 404, { 'content-type': 'text/plain' })
                response.write('error')
                response.end()
            })
        })
        server.on('upgrade', function (request, socket, head) {
            upgrader.upgrade(request, socket, head)
        })
        server.listen(8088, '127.0.0.1', async())
    }, function () {
        var envoy2, envoy1, envoy
        async(function () {
            var request = http.request({
                host: '127.0.0.1',
                port: 8088,
                headers: Envoy.Middleware.headers('/identifier/key', {
                    host: '127.0.0.1:8088'
                })
            })
            delta(async()).ee(request).on('upgrade')
            request.end()
        }, function (request, socket, head) {
            envoy2 = {
                middleware: new Envoy.Middleware(function (request, response) {
                    assert(true, 'selected')
                    response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                    response.write('Hello, World!')
                    response.end()
                }),
                conduit: new Envoy.Conduit
            }
            envoy2.middleware.listen(abend)
            envoy2.conduit.connect(envoy2.middleware.server, request, socket, head, abend)
            envoy2.conduit.ready.wait(async())
        }, function () {
            var request = http.request({
                host: '127.0.0.1',
                port: 8088,
                headers: Envoy.Middleware.headers('/identifier', {
                    host: '127.0.0.1:8088'
                })
            })
            delta(async()).ee(request).on('upgrade')
            request.end()
        }, function (request, socket, head) {
            envoy1 = {
                middleware: new Envoy.Middleware(function (request, response) {
                    response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                    response.write('Hello, World!')
                    response.end()
                }),
                conduit: new Envoy.Conduit
            }
            envoy1.middleware.listen(abend)
            envoy1.conduit.connect(envoy1.middleware.server, request, socket, head, abend)
            envoy1.conduit.ready.wait(async())
        }, function () {
            var request = http.request({
                host: '127.0.0.1',
                port: 8088,
                headers: Envoy.Middleware.headers('/identifier', {
                    host: '127.0.0.1:8088'
                })
            })
            delta(async()).ee(request).on('upgrade')
            request.end()
        }, function (request, socket, head) {
            envoy = {
                middleware: new Envoy.Middleware(function (request, response) {
                    response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                    response.write('Hello, World!')
                    response.end()
                }),
                conduit: new Envoy.Conduit
            }
            envoy.middleware.listen(abend)
            envoy.conduit.connect(envoy.middleware.server, request, socket, head, abend)
            envoy.conduit.ready.wait(async())
        }, function () {
            envoy1.conduit.close()
            envoy1.middleware.destroy()
        }, function () {
            setTimeout(async(), 1000)
        }, function () {
            ua.fetch({
                url: 'http://127.0.0.1:8088/identifier/key/hello',
                post: {}
            }, async())
        }, function (message, response) {
            assert(message, 'Hello, World!', 'body')
            rendezvous.middleware.destroy()
            rendezvous.conduit.destroy()
        }, function () {
            envoy.conduit.close()
            envoy.middleware.destroy()
            envoy2.conduit.close()
            envoy2.middleware.destroy()
        }, function () {
            server.close(async())
        })
    })
}
