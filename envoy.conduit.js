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

function Envoy (ware) {
    this._request = 0
    this._destructible = new Destructible('conduit.envoy')
    this._destructible.markDestroyed(this, 'destroyed')
    this.ready = new Signal
    this._destructible.addDestructor('connected', this.ready, 'unlatch')
}

Envoy.prototype.close = function () {
    this._destructible.destroy()
}

Envoy.prototype.connect = cadence(function (async, server, request, socket, head) {
    // Seems harsh, but once the multiplexer has been destroyed nothing is going
    // to be listening for any final messages.
    this._destructible.addDestructor('socket', socket, 'destroy')
    this._conduit = new Conduit(socket, socket, server)
    this._conduit.ready.wait(this.ready, 'unlatch')
    this._destructible.addDestructor('conduit', this._conduit, 'destroy')
    // TODO Do you pass the ready listener into the connection function?
    this._conduit.listen(head, this._destructible.monitor('conduit'))
    this._destructible.completed(async())
})

module.exports = Envoy
