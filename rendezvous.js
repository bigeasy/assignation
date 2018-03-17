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

function Rendezvous (destructible) {
    this._connections = new WildMap
    this._destructible = destructible
    this._destructible.markDestroyed(this)
    this._instance = '0'
    this.paths = []
}

Rendezvous.prototype.middleware = function (request, response, next) {
    var parsed = url.parse(request.url)
    var path = parsed.path.split('/')
    var connection = this._connections.match(path).pop()
    if (connection) {
        connection.requester.request(request, response)
    } else {
        next()
    }
}

function rewrite (header) {
    var location = url.parse(header.url)
    var path = location.pathname
    location.pathname = location.pathname.substring(connection.path.length)
    header.url = url.format(location)
    header.addHTTPHeader('x-rendezvous-actual-path', path)
}

Rendezvous.prototype.upgrade = function (request, socket) {
    console.log('UPGRADED!')
    if (this.destroyed) {
        socket.destroy()
        return
    }
    if (request.headers['x-rendezvous-path'] == null) {
        socket.destroy()
        return
    }
    this._destructible.monitor(true, [ 'upgrade', this._instance++ ], this, '_upgrade', request, socket, null)
}

Rendezvous.prototype._upgrade = cadence(function (async, request, socket) {
    var path = request.headers['x-rendezvous-path']
    var paths = this.paths, connections = this._connections, magazine = this._magazine

    var instance = this._instance = Monotonic.increment(this._instance, 0)

    var parts = path.split('/')

    connections.get(parts).forEach(function (connection) {
        connection.destructible.destroy()
    })

    destructible.destruct.wait(socket, 'destroy')

    var destroy = destructible.destroy.bind(destructible)
    socket.on('error', destroy)
    socket.on('close', destroy)
    socket.on('end', destroy)


    async(function () {
        destructible.monitor('client', Client, async())
    }, function (client) {
        async(function () {
            destructible.monitor('conduit', Conduit, socket, socket, client, async())
        }, function () {
            destructible.monitor('requester', Requester, client, rewrite, async())
        }, function (requester) {
            var connection = {
                path: path,
                requester: requester,
                destructible: destructible
            }
            connections.add(parts, connection)
            paths.push(path)
            destructible.destruct.wait(function () {
                var current = connections.get(parts).filter(function (connection) {
                    return connection.path == path
                }).shift()
                if (current === connection) {
                    connections.remove(parts, connection)
                    paths.splice(paths.indexOf(path), 1)
                }
            })
        })
    })
})

module.exports = function (destructible, callback) {
    callback(null, new Rendezvous(destructible))
}
