require('proof')(6, require('cadence')(prove))

function prove (async, assert) {
    var delta = require('delta')
    var abend = require('abend')
    var http = require('http')
    var Rendezvous = require('../rendezvous')
    var Envoy = require('../envoy')
    var UserAgent = require('vizsla')
    var ua = new UserAgent
    var Upgrader = require('downgrader')
    var upgrader = new Upgrader
    var sockets = []
    var rendezvous = new Rendezvous
    rendezvous.upgrade({
        headers: {}
    }, {
        destroy: function () {
            assert(true, 'missing protocol identification header')
        }
    }, null)
    upgrader.on('socket', rendezvous.upgrade.bind(rendezvous))
    var server = http.createServer(function (request, response) {
        rendezvous.middleware(request, response, function (error) {
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
            headers: Envoy.headers('/identifier', {
                host: '127.0.0.1:8088'
            })
        })
        delta(async()).ee(request).on('upgrade')
        request.end()
    }, function (request, socket, head) {
        var envoy = new Envoy(function (request, response) {
            response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
            response.write('Hello, World!')
            response.end()
        })
        envoy.connect(request, socket, head, abend)
        async(function () {
            envoy.ready.wait(async())
        }, function () {
            ua.fetch({
                url: 'http://127.0.0.1:8088/identifier/hello',
                post: {}
            }, async())
        }, function (message) {
            assert(message, 'Hello, World!', 'body')
            envoy.close()
            setTimeout(async(), 250)
        }, function () {
            rendezvous.destroy()
        }, function () {
            server.close(async())
        }, function () {
            rendezvous.upgrade(null, {
                destroy: function () {
                    assert(true, 'was destroyed')
                }
            }, null)
        })
    }, function () {
        upgrader = new Upgrader
        rendezvous = new Rendezvous
        upgrader.on('socket', rendezvous.upgrade.bind(rendezvous))
        server = http.createServer(function (request, response) {
            rendezvous.middleware(request, response, function (error) {
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
                headers: Envoy.headers('/identifier/key', {
                    host: '127.0.0.1:8088'
                })
            })
            delta(async()).ee(request).on('upgrade')
            request.end()
        }, function (request, socket, head) {
            envoy2 = new Envoy(function (request, response) {
                assert(true, 'selected')
                response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                response.write('Hello, World!')
                response.end()
            })
            envoy2.connect(request, socket, head, abend)
            envoy2.ready.wait(async())
        }, function () {
            var request = http.request({
                host: '127.0.0.1',
                port: 8088,
                headers: Envoy.headers('/identifier', {
                    host: '127.0.0.1:8088'
                })
            })
            delta(async()).ee(request).on('upgrade')
            request.end()
        }, function (request, socket, head) {
            envoy1 = new Envoy(function (request, response) {
                response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                response.write('Hello, World!')
                response.end()
            })
            envoy1.connect(request, socket, head, abend)
            envoy1.ready.wait(async())
        }, function () {
            var request = http.request({
                host: '127.0.0.1',
                port: 8088,
                headers: Envoy.headers('/identifier', {
                    host: '127.0.0.1:8088'
                })
            })
            delta(async()).ee(request).on('upgrade')
            request.end()
        }, function (request, socket, head) {
            envoy = new Envoy(function (request, response) {
                response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                response.write('Hello, World!')
                response.end()
            })
            envoy.connect(request, socket, head, abend)
            envoy.ready.wait(async())
        }, function () {
            envoy1.close()
        }, function () {
            setTimeout(async(), 1000)
        }, function () {
            ua.fetch({
                url: 'http://127.0.0.1:8088/identifier/key/hello',
                post: {}
            }, async())
        }, function (message, response) {
            assert(message, 'Hello, World!', 'body')
            rendezvous.destroy()
        }, function () {
            envoy.close()
            envoy2.close()
        }, function () {
            server.close(async())
        })
    })
}
