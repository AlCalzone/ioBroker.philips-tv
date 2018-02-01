"use strict";
///
/// Stellt einen Promise-Wrapper für asynchrone Node-Funktionen zur Verfügung
///
Object.defineProperty(exports, "__esModule", { value: true });
function promisify(fn, context) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        context = context || this;
        return new Promise(function (resolve, reject) {
            fn.apply(context, args.concat([function (error, result) {
                    if (error) {
                        return reject(error);
                    }
                    else {
                        return resolve(result);
                    }
                }]));
        });
    };
}
exports.promisify = promisify;
function promisifyNoError(fn, context) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        context = context || this;
        return new Promise(function (resolve) {
            fn.apply(context, args.concat([function (result) {
                    return resolve(result);
                }]));
        });
    };
}
exports.promisifyNoError = promisifyNoError;
// tslint:enable:ban-types
/** Creates a promise that waits for the specified time and then resolves */
function wait(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}
exports.wait = wait;
