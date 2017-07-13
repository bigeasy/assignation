var assert = require('assert')
var abend = require('abend')
var cadence = require('cadence')
var coalesce = require('extant')
var WildMap = require('wildmap')
var nop = require('nop')
var url = require('url')
var Destructible = require('destructible')
var Monotonic = require('monotonic').asString
var Request = require('./request')
var Conduit = require('conduit')
var Client = require('conduit/client')
var errorify = require('./errorify')
var Operation = require('operation/variadic')

function Rendezvous () {
    var vargs = Array.prototype.slice.call(arguments)

    this._upgrade = Operation(vargs)

    this._destructible = new Destructible('rendezvous.conduit')
    this._destructible.markDestroyed(this)
    this._destructible.addDestructor('close', this, '_close')
    this._instance = '0'
    this._connections = []
}

Rendezvous.prototype.upgrade = function (request, socket) {
    if (this.destroyed) {
        socket.destroy()
        return
    }

    var instance = this._instance = Monotonic.increment(this._instance, 0)
    var upgrade = this._upgrade.call(null, instance, request)
    if (upgrade == null) {
        socket.destroy()
        return
    }

    var connections = this._connections

    var conduit = new Conduit(socket, socket, upgrade.client)
    var connection = {
        close: close,
        socket: socket,
        instance: instance,
        conduit: conduit
    }
    // TODO Destructible listener.
    connection.conduit.listen(null, abend)
    connections[instance] = connection

    socket.on('error', close)
    socket.on('close', close)
    socket.on('end', close)

    var closed = false

    function close () {
        if (!socket.destroyed) {
            socket.destroy()
        }
        if (closed) {
            return
        }

        closed = true

        upgrade.destroy()
        conduit.destroy()

        delete connections[instance]
    }
}

Rendezvous.prototype._close = function () {
    for (var instance in this._connections) {
        var connection = this._connections[instance]
        connection.close.call(null)
    }
}

Rendezvous.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Rendezvous
