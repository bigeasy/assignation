var cadence = require('cadence')
var delta = require('delta')

var abend = require('abend')
var coalesce = require('extant')

var Interlocutor = require('interlocutor')
var protocols = { http: require('http'), https: require('https') }

var url = require('url')

var Signal = require('signal')

var Destructible = require('destructible')

var coalesce = require('extant')

var Conduit = require('conduit')
var Server = require('conduit/server')

var Downgrader = require('downgrader')

var Response = require('./response')

var interrupt = require('interrupt').createInterrupter('assignation')

var Middleware = require('conduit/middleware')

function Envoy (middleware) {
    this._request = 0
    this._middleware = new Middleware(middleware)
    this._server = new Server(middleware, 'socket')
}

Envoy.headers = function (path, headers) {
    headers = Downgrader.headers(headers)
    headers['x-rendezvous-path'] = path
    return headers
}

Envoy.prototype.monitor = cadence(function (async, destructible, socket, head) {
    interrupt.assert(! this.listening, 'already running')

    destructible.markDestroyed(this)
    destructible.destruct.wait(socket, 'destroy')

    var server = new Server(this._middleware, 'socket')
    async(function () {
        destructible.destruct.wait(server, 'destroy')
        destructible.monitor('server', server, 'stack', async())
    }, function () {
        var conduit = new Conduit(socket, socket, server)
        destructible.destruct.wait(conduit, 'destroy')
        destructible.monitor('conduit', conduit, 'stack', async())
    })
})

module.exports = cadence(function (async, destructible, middleware, socket, header) {
    async(function () {
        destructible.monitor('middleware', Middleware, middleware, async())
    }, function (middleware) {
        destructible.monitor('client', Server, middleware, async())
    }, function (server) {
        destructible.monitor('conduit', Conduit, socket, socket, server, async())
    })
})
