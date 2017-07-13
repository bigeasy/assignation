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
    this._connections = new WildMap
    this._instances = {}

    this._destructible = new Destructible('rendezvous')
    this._destructible.markDestroyed(this)
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

Rendezvous.prototype.upgrade = function (instance, request) {
    var path = request.headers['x-rendezvous-path']
    if (path == null) {
        return null
    }

    var parts = path.split('/')
    this._connections.get(parts).forEach(function (connection) {
        delete this._instances[connection.instance]
        connection.client.read.push(null)
    }, this)

    var client = new Client
    var connection = { path: path, client: client, instance: instance }

    this._instances[instance] = connection
    this._connections.add(parts, connection)

    return {
        client: client,
        destroy: function () {
            delete this._instances[instance]
            this._connections.remove(parts, connection)
        }.bind(this)
    }
}

Rendezvous.prototype.destroy = function () {
    this._destructible.destroy()
}

module.exports = Rendezvous
