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

function Envoy (middleware) {
    this._interlocutor = new Interlocutor(middleware)
    this._destructible = new Destructible
    this._destructible.markDestroyed(this, 'destroyed')
    this.ready = new Signal
    this._destructible.addDestructor('connected', this.ready, 'unlatch')
}

Envoy.prototype._connect = function (socket, envelope) {
    // TODO Instead of abend, something that would stop the request.
    new Response(this._interlocutor, socket, envelope).respond(abend)
}

// TODO Not sure exactly how to shutdown all the individual sockets but probably
// they're going to have to see an end-of-stream and shutdown.

//
Envoy.prototype._close = cadence(function (async) {
    this._destructible.destroy()
})

Envoy.prototype.close = function (callback) {
    this._close(coalesce(callback, abend))
}

Envoy.headers = function (path, headers) {
    headers = Downgrader.headers(headers)
    headers['x-rendezvous-path'] = path
    return headers
}

Envoy.prototype.connect = cadence(function (async, request, socket, head) {
    // Seems harsh, but once the multiplexer has been destroyed nothing is going
    // to be listening for any final messages.
    // TODO How do you feel about `bind`?
    this._destructible.addDestructor('socket', socket, 'destroy')
    this._conduit = new Conduit(socket, socket)
    this._conduit.ready.wait(this.ready, 'unlatch')
    this._server = new Server({
        object: this, method: '_connect'
    }, 'rendezvous', this._conduit.read, this._conduit.write)
    this._destructible.addDestructor('conduit', this._conduit, 'destroy')
    this._conduit.listen(head, this._destructible.monitor('conduit'))
    this._destructible.completed(async())
})

module.exports = Envoy
