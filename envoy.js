var cadence = require('cadence')

var url = require('url')

var Conduit = require('conduit')
var Server = require('conduit/server')

var Downgrader = require('downgrader')

var Middleware = require('conduit/middleware')

module.exports = cadence(function (async, destructible, middleware, socket, header) {
    async(function () {
        destructible.monitor('middleware', Middleware, middleware, async())
    }, function (middleware) {
        destructible.monitor('server', Server, middleware, 'socket', async())
    }, function (server) {
        destructible.destruct.wait(function () {
            server.write.push(null)
        })
        destructible.monitor('conduit', Conduit, socket, socket, server, async())
    })
})

module.exports.headers = function (path, headers) {
    headers = Downgrader.headers(headers)
    headers['x-rendezvous-path'] = path
    return headers
}
