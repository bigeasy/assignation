var cadence = require('cadence')
var delta = require('delta')
var Staccato = require('staccato')
var Procession = require('procession')

function Response (interlocutor, envelope) {
    var headers = envelope.body.headers
    this._request = interlocutor.request({
        httpVersion: envelope.body.httpVersion,
        method: envelope.body.method,
        path: envelope.body.url,
        headers: headers,
        rawHeaders: envelope.body.rawHeaders
    })
    this.read = new Procession
    this.write = new Procession
    this.write.shifter().pump(this, '_enqueue')
}

Response.prototype.listen = cadence(function (async) {
    async(function () {
        delta(async()).ee(this._request).on('response')
    }, function (response) {
        async(function () {
            this.read.enqueue({
                module: 'rendezvous',
                method: 'header',
                body: {
                    statusCode: response.statusCode,
                    statusMessage: response.statusMessage,
                    headers: response.headers
                }
            }, async())
        }, function () {
            var reader = new Staccato.Readable(response)
            var loop = async(function () {
                async(function () {
                    reader.read(async())
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
            // TODO Use Conduit framing, use this only for actual trailers.
            this.read.enqueue({
                module: 'rendezvous',
                method: 'trailer',
                body: null
            }, async())
        }, function () {
            console.log('response end')
            this.read.enqueue(null, async())
        })
    }, function () {
        return []
    })
})

Response.prototype._enqueue = cadence(function (async, envelope) {
    if (envelope == null) {
        return []
    }
    switch (envelope.method) {
    case 'chunk':
        this._request.write(envelope.body, async())
        break
    case 'trailer':
        this._request.end()
        break
    }
    return []
})

module.exports = Response
