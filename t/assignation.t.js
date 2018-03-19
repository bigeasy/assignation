require('proof')(5, require('cadence')(prove))

function prove (async, assert) {
    var delta = require('delta')
    var abend = require('abend')
    var http = require('http')
    var Rendezvous = require('../rendezvous')
    var Envoy = require('../envoy')
    var Destructible = require('destructible')
    var UserAgent = require('vizsla')
    var ua = new UserAgent
    var Upgrader = require('downgrader')
    var upgrader = new Upgrader
    var sockets = []

    var destructible = new Destructible('t/assignation.t.js')

    destructible.completed.wait(async())

    async([function () {
        destructible.destroy()
    }], function () {
        destructible.monitor('rendezvous', Rendezvous, async())
    }, function (rendezvous) {
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
        server.listen(8088, '127.0.0.1', async())
        destructible.destruct.wait(server, 'close')
        destructible.destruct.wait(function () {
            rendezvous.upgrade(null, {
                destroy: function () {
                    assert(true, 'was destroyed')
                }
            }, null)
        })
        rendezvous.upgrade({
            headers: {}
        }, {
            destroy: function () {
                assert(true, 'missing protocol identification header')
            }
        }, null)
    }, function () {
        ua.fetch({
            url: 'http://127.0.0.1:8088/identifier/hello',
            timeout: 1000
        }, async())
    }, function (body, response) {
        assert(response.statusCode, 404, 'http not found')
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
    }, function (request, socket, header) {
        async(function () {
            destructible.monitor([ 'envoy', 1 ], true, Envoy, function (request, response) {
                response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                response.write('Hello, World!')
                response.end()
            }, socket, header, async())
        }, function (envoy) {
            async(function () {
                ua.fetch({
                    url: 'http://127.0.0.1:8088/identifier/hello',
                    post: {},
                    timeout: 1000
                }, async())
            }, function (message) {
                assert(message, 'Hello, World!', 'body')
            })
        })
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
    }, function (request, socket, header) {
        async(function () {
            destructible.monitor([ 'envoy', 1 ], true, Envoy, function (request, response) {
                response.writeHead(200, 'OK', { 'content-type': 'text/plain' })
                response.write('Hello, World!')
                response.end()
            }, socket, header, async())
        }, function (envoy) {
            async(function () {
                ua.fetch({
                    url: 'http://127.0.0.1:8088/identifier/hello',
                    post: {},
                    timeout: 1000
                }, async())
            }, function (message) {
                assert(message, 'Hello, World!', 'body')
            })
        })
    })
}
