// Control-flow utilities.
var cadence = require('cadence')

// Read and write streams with error-first callbacks.
var Staccato = require('staccato')

// Return the first not null-like value.
var coalesce = require('extant')

// Do nothing.
var nop = require('nop')

// Proxied header constructor.
var Header = require('./header')

// An evented message queue.
var Procession = require('procession')

// Create a new request that proxies the given Node.js HTTP request and response
// through the given Conduit client. An optional rewrite function can be used to
// amend the HTTP headers before the request is proxied.

//
function Request (client, request, response, rewrite) {
    this._client = client
    this._request = request
    this._response = response
    this._rewrite = coalesce(rewrite, nop)
    this.read = new Procession
    this.write = new Procession
    this.write.shifter().pump(this, '_enqueue')
}

Request.prototype._enqueue = cadence(function (async, envelope) {
    if (envelope == null) {
        return []
    }
    switch (envelope.method) {
    case 'header':
        this._response.writeHead(envelope.body.statusCode,
            envelope.body.statusMessage, envelope.body.headers)
        break
    case 'chunk':
        this._response.write(envelope.body, async())
        break
    case 'trailer':
        this._response.end()
        break
    }
    return []
})

// http://stackoverflow.com/a/5426648
Request.prototype.consume = cadence(function (async) {
    async(function () {
        var header = new Header(this._request)
        this._rewrite.call(null, header)
        this._client.connect({
            module: 'rendezvous',
            method: 'header',
            body: header
        }, this)
        var readable = new Staccato.Readable(this._request)
        var loop = async(function () {
            async(function () {
                readable.read(async())
            }, function (buffer) {
                if (buffer == null) {
                    return [ loop.break ]
                }
                this.read.enqueue({
                    module: 'rendezvous',
                    method: 'chunk',
                    body: buffer
                }, async())
            })
        })()
    }, function () {
        this.read.enqueue({
            module: 'rendezvous',
            method: 'trailer',
            body: null
        }, async())
    }, function () {
        this.read.enqueue(null, async())
    })
})

module.exports = Request
