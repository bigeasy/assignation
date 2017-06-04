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

function Rendezvous () {
    this._connections = new WildMap
    this._destructible = new Destructible('rendezvous')
    this._destructible.markDestroyed(this)
    this._destructible.addDestructor('close', this, '_close')
    this._instance = '0'
    this.paths = []
}

Rendezvous.prototype.middleware = function (request, response, next) {
    var parsed = url.parse(request.url)
    var path = parsed.path.split('/')
    var connection = this._connections.match(path).pop()
    if (connection) {
        var request = new Request(connection.client, request, response, function (header) {
            var location = url.parse(header.url)
            var path = location.pathname
            location.pathname = location.pathname.substring(connection.path.length)
            header.url = url.format(location)
            header.addHTTPHeader('x-rendezvous-actual-path', path)
        })
        request.consume(errorify(next))
    } else {
        next()
    }
}

Rendezvous.prototype.upgrade = function (request, socket) {
    if (this.destroyed) {
        socket.destroy()
        return
    }
    var path = request.headers['sec-conduit-rendezvous-path']
    if (path == null) {
        socket.destroy()
        return
    }
    var paths = this.paths, connections = this._connections, magazine = this._magazine

    var instance = this._instance = Monotonic.increment(this._instance, 0)

    var parts = path.split('/')

    connections.get(parts).forEach(function (connection) {
        connection.close.call(null)
    })
    var conduit = new Conduit(socket, socket)
    var client = new Client('rendezvous', conduit.read, conduit.write)
    var connection = {
        path: path,
        close: close,
        socket: socket,
        instance: instance,
        conduit: conduit,
        client: client
    }
    // TODO Instead of `abend`, some sort of cleanup and recovery.
    // TODO Wait for `ready` to add the connection and push the path.
    connection.conduit.listen(abend)
    connections.add(parts, connection)
    paths.push(path)

    socket.on('error', close)
    socket.on('close', close)
    socket.on('end', close)

    function close () {
        // TODO Why is this called twice?
        connection.conduit.destroy()
        if (!socket.destroyed) {
            socket.destroy()
        }
        var current = connections.get(parts).filter(function (connection) {
            return connection.path == path
        }).shift()
        if (current && current.instance == instance) {
            connections.remove(parts, connection)
            paths.splice(paths.indexOf(path), 1)
        }
    }
}

// TODO Maybe close is different from destroy?
Rendezvous.prototype._close = function () {
    this.paths.slice(0, this.paths.length).forEach(function (path) {
        this._connections.get(path.split('/')).forEach(function (connection) {
            connection.conduit.destroy()
            connection.socket.destroy()
        })
    }, this)
}

Rendezvous.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Rendezvous
