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

function Envoy (middleware) {
    this._request = 0
    this._interlocutor = new Interlocutor(middleware)
    this._destructible = new Destructible(1000, 'envoy')
    this._destructible.markDestroyed(this, 'destroyed')
    this.ready = new Signal
    this._destructible.destruct.wait(this.ready, 'unlatch')
}

Envoy.prototype._connect = function (envelope) {
    // TODO Instead of abend, something that would stop the request.
    var response = new Response(this._interlocutor, envelope)
    response.listen(this._destructible.monitor([ 'respond', this._request++ ], true))
    return response
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

Envoy.prototype.stack = cadence(function (async, initializer, socket, head) {
    interrupt.assert(this._destroy.open == null, 'destroyed')
    this._destroy.wait(socket, 'destroy')
    this._conduit = new Conduit(socket, socket, this._server)
    this._destroy.wait(this._conduit, 'destroy')
    this._conduit.listen(head, async())
    iniitalizer.ready()
})

Envoy.prototype.connect = cadence(function (async, request, socket, head) {
    // Seems harsh, but once the multiplexer has been destroyed nothing is going
    // to be listening for any final messages.
    this._destructible.destruct.wait(socket, 'destroy')
    this._server = new Server(this, '_connect')
    this._conduit = new Conduit(socket, socket, this._server)
    this._conduit.ready.wait(this.ready, 'unlatch')
    this._destructible.destruct.wait(this._conduit, 'destroy')
    // TODO Do you pass the ready listener into the connection function?
    this._conduit.listen(head, this._destructible.monitor('conduit'))
    this._destructible.completed.wait(async())
})

module.exports = Envoy
