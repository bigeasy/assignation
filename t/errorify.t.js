require('proof')(1, prove)

function prove (assert) {
    var errorify = require('../errorify')
    errorify(function (error) {
        assert(error.message, 'thrown', 'caught')
    })(new Error('thrown'))
}
