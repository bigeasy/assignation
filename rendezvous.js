var cadence = require('cadence')
var url = require('url')
var WildMap = require('wildmap')
var Requester = require('conduit/requester')
var Conduit = require('conduit')
var Client = require('conduit/client')

function Rendezvous (destructible) {
    this._connections = new WildMap
    this._destructible = destructible
    this._destructible.markDestroyed(this)
    this._instance = '0'
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

Rendezvous.prototype.upgrade = function (request, socket) {
    if (this.destroyed) {
        socket.destroy()
        return
    }
    if (request.headers['x-rendezvous-path'] == null) {
        socket.destroy()
        return
    }
    this._destructible.monitor([ 'upgrade', this._instance++ ], true, this, '_upgrade', request, socket, null)
}

Rendezvous.prototype._upgrade = cadence(function (async, destructible, request, socket) {
    var path = request.headers['x-rendezvous-path']
    var connections = this._connections, magazine = this._magazine

    var parts = path.split('/')

    this._connections.get(parts).forEach(function (connection) {
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
        destructible.destruct.wait(function () {
            client.write.push(null)
        })
        async(function () {
            destructible.monitor('conduit', Conduit, socket, socket, client, async())
        }, function () {
            destructible.monitor('requester', Requester, client, function (header) {
                var location = url.parse(header.url)
                var path = location.pathname
                location.pathname = location.pathname.substring(path.length)
                header.url = url.format(location)
                header.addHTTPHeader('x-rendezvous-actual-path', path)
            }, async())
        }, function (requester) {
            var connection = {
                path: path,
                requester: requester,
                destructible: destructible
            }
            this._connections.add(parts, connection)
            destructible.destruct.wait(this, function () {
                this._connections.remove(parts, connection)
            })
        })
    })
})

module.exports = function (destructible, callback) {
    callback(null, new Rendezvous(destructible))
}
