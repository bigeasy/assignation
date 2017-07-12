var Downgrader = require('downgrader')
var Interlocutor = require('interlocutor')
var Server = require('conduit/server')
var Destructible = require('destructible')
var Signal = require('signal')
var Response = require('./response')

function Envoy (middleware) {
    this._request = 0
    this._interlocutor = new Interlocutor(middleware)
    this.server = new Server(this, '_connect')
    this.destroyed = false
    this._completed = new Signal
    this._destructible = new Destructible('middleware.envoy')
    this._destructible.markDestroyed(this, 'destroyed')
    this._destructible.addDestructor('completed', this._completed, 'unlatch')
}

Envoy.prototype.destroy = function () {
    this._destructible.destroy()
}

Envoy.headers = function (path, headers) {
    headers = Downgrader.headers(headers)
    var amended = {}
    for (var name in headers) {
        amended[name] = headers[name]
    }
    amended['x-rendezvous-path'] = path
    return amended
}

Envoy.prototype.listen = function (callback) {
    this._completed.wait(this._destructible.monitor([ 'completed' ]))
    this._destructible.completed(callback)
}

Envoy.prototype._connect = function (envelope) {
    // TODO Instead of abend, something that would stop the request.
    var response = new Response(this._interlocutor, envelope)
    response.listen(this._destructible.rescue([ 'respond', this._request++ ]))
    return response
}

module.exports = Envoy
