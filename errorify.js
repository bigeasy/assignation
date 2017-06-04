module.exports = function (next) {
    return function (error) {
        if (error) next(error)
    }
}
