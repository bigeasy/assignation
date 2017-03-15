require('proof/redux')(1, prove)

function prove (assert) {
    var Assignation = require('..')
    assert(Assignation, 'require')
}
