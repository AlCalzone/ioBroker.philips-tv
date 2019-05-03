"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function entries(obj) {
    return Object.keys(obj)
        .map(function (key) { return [key, obj[key]]; });
}
exports.entries = entries;
function values(obj) {
    return Object.keys(obj)
        .map(function (key) { return obj[key]; });
}
exports.values = values;
function filter(obj, predicate) {
    var ret = {};
    for (var _i = 0, _a = entries(obj); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], val = _b[1];
        if (predicate(val))
            ret[key] = val;
    }
    return ret;
}
exports.filter = filter;
function composeObject(properties) {
    return properties.reduce(function (acc, _a) {
        var key = _a[0], value = _a[1];
        acc[key] = value;
        return acc;
    }, {});
}
exports.composeObject = composeObject;
