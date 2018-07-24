"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var https = require("https");
var requestPackage = require("request-promise-native");
var request = requestPackage.defaults({
    timeout: 5000,
    rejectUnauthorized: false,
});
var global_1 = require("../lib/global");
var promises_1 = require("../lib/promises");
var RETRY_OPTIONS = {
    maxTries: 3,
    retryDelay: 200,
    retryBackoffFactor: 2,
    recoverableErrors: ["ETIMEDOUT", "ESOCKETTIMEDOUT"],
};
var httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 1,
});
var httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 1,
    rejectUnauthorized: false,
});
function getAgent(path) {
    return path.startsWith("https")
        ? httpsAgent
        : httpAgent;
}
/** Retries a request on recoverable errors */
function retry(requestMethod) {
    return __awaiter(this, void 0, void 0, function () {
        var ret, i, e_1, isRecoverable, waitTime;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 1;
                    _a.label = 1;
                case 1:
                    if (!(i <= RETRY_OPTIONS.maxTries)) return [3 /*break*/, 9];
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 8]);
                    global_1.Global.log("  attempt " + i + " of " + RETRY_OPTIONS.maxTries, "debug");
                    return [4 /*yield*/, requestMethod()];
                case 3:
                    ret = _a.sent();
                    return [2 /*return*/, ret];
                case 4:
                    e_1 = _a.sent();
                    isRecoverable = RETRY_OPTIONS.recoverableErrors.indexOf(e_1.code) > -1;
                    global_1.Global.log("  attempt " + i + " failed with code " + e_1.code, "debug");
                    global_1.Global.log("  error is " + (isRecoverable ? "" : "not ") + " recoverable", "debug");
                    if (!(i < RETRY_OPTIONS.maxTries && RETRY_OPTIONS.recoverableErrors.indexOf(e_1.code) > -1)) return [3 /*break*/, 6];
                    waitTime = RETRY_OPTIONS.retryDelay * Math.pow(RETRY_OPTIONS.retryBackoffFactor, (i - 1));
                    global_1.Global.log("  waiting " + waitTime + " ms", "debug");
                    return [4 /*yield*/, promises_1.wait(waitTime)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    global_1.Global.log("  no further attempts", "debug");
                    throw e_1;
                case 7: return [3 /*break*/, 8];
                case 8:
                    i++;
                    return [3 /*break*/, 1];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/** Performs a GET request on the given resource and returns the result */
function request_get(path, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(this, void 0, void 0, function () {
        var reqOpts;
        return __generator(this, function (_a) {
            reqOpts = Object.assign(options, {
                uri: path,
                rejectUnauthorized: false,
                agent: getAgent(path),
            });
            return [2 /*return*/, retry(function () { return request(reqOpts); })];
        });
    });
}
function checkConnection(hostname) {
    return __awaiter(this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global_1.Global.log("checking if connection is alive", "debug");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // We always use the non-overwritten version for this as
                    // we might not have credentials yet.
                    return [4 /*yield*/, request_get("http://" + hostname + ":1925", {
                            simple: false,
                        })];
                case 2:
                    // We always use the non-overwritten version for this as
                    // we might not have credentials yet.
                    _a.sent();
                    global_1.Global.log("connection is ALIVE", "debug");
                    return [2 /*return*/, true];
                case 3:
                    e_2 = _a.sent();
                    // handle a couple of possible errors
                    switch (e_2.code) {
                        case "ECONNREFUSED":
                        case "ECONNRESET":
                            // the remote host is there, but it won't let us connect
                            // e.g. when trying to connect to port 1925 on a v6 TV
                            global_1.Global.log("connection is ALIVE, but remote host won't let us connect", "debug");
                            return [2 /*return*/, true];
                        case "ETIMEDOUT":
                        default:
                            global_1.Global.log("connection is DEAD. Reason: [" + e_2.code + "] " + e_2.message, "debug");
                            return [2 /*return*/, false];
                    }
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Common base class for all specialized APIs that support a range of devices
 */
var API = /** @class */ (function () {
    function API(
    /** The hostname this wrapper is bound to */
    hostname) {
        this.hostname = hostname;
        this._params = new Map();
    }
    API.create = function (hostname) {
        return __awaiter(this, void 0, void 0, function () {
            var ret, _i, _a, apiType;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, checkConnection(hostname)];
                    case 1:
                        if (!(_b.sent()))
                            throw new Error("No connection to host " + hostname);
                        global_1.Global.log("detecting API version", "debug");
                        _i = 0, _a = [api_v1_1.APIv1, api_v5_1.APIv5, api_v6_1.APIv6];
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                        apiType = _a[_i];
                        global_1.Global.log("testing " + apiType.name, "debug");
                        ret = new apiType(hostname);
                        return [4 /*yield*/, ret.test()];
                    case 3:
                        if (!_b.sent()) return [3 /*break*/, 4];
                        global_1.Global.log("TV has " + apiType.name, "debug");
                        return [2 /*return*/, ret];
                    case 4: 
                    // don't request too fast
                    return [4 /*yield*/, promises_1.wait(100)];
                    case 5:
                        // don't request too fast
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 2];
                    case 7: return [2 /*return*/, undefined];
                }
            });
        });
    };
    Object.defineProperty(API.prototype, "params", {
        /** Additional params that should be stored over several API uses */
        get: function () {
            return this._params;
        },
        enumerable: true,
        configurable: true
    });
    API.prototype.getRequestPath = function (path) {
        return path.startsWith("http") ? path : "" + this.requestPrefix + path;
    };
    /** Performs a GET request on the given resource and returns the result */
    API.prototype._get = function (path, options) {
        if (options === void 0) { options = {}; }
        global_1.Global.log("get(\"" + path + "\")", "debug");
        // normalize path
        path = this.getRequestPath(path);
        var reqOpts = Object.assign(options, {
            uri: path,
            agent: getAgent(path),
        });
        return retry(function () { return request(reqOpts); });
    };
    /** Performs a GET request on the given resource and returns the result */
    API.prototype.get = function (path, options) {
        if (options === void 0) { options = {}; }
        return this._get(path, options);
    };
    /** Performs a GET request on the given resource and returns the result */
    API.prototype.getWithDigestAuth = function (path, credentials, options) {
        if (options === void 0) { options = {}; }
        global_1.Global.log("getWithDigestAuth(\"" + path + "\")", "debug");
        // normalize path
        path = this.getRequestPath(path);
        var reqOpts = Object.assign(options, {
            uri: path,
            agent: getAgent(path),
            auth: {
                username: credentials.username,
                password: credentials.password,
                sendImmediately: false,
            },
        });
        return retry(function () { return request(reqOpts); });
    };
    /** Posts JSON data to the given resource and returns the result */
    API.prototype.postJSONwithDigestAuth = function (path, credentials, jsonPayload, options) {
        if (options === void 0) { options = {}; }
        global_1.Global.log("postJSONwithDigestAuth(\"" + path + "\", " + JSON.stringify(jsonPayload) + ")", "debug");
        // normalize path
        path = this.getRequestPath(path);
        var reqOpts = Object.assign(options, {
            uri: path,
            agent: getAgent(path),
            method: "POST",
            json: jsonPayload,
            auth: {
                username: credentials.username,
                password: credentials.password,
                sendImmediately: false,
            },
        });
        return retry(function () { return request(reqOpts); });
    };
    /** Posts JSON data to the given resource and returns the result */
    API.prototype.postJSON = function (path, jsonPayload, options) {
        if (options === void 0) { options = {}; }
        global_1.Global.log("postJSON(\"" + path + "\", " + JSON.stringify(jsonPayload) + ")", "debug");
        // normalize path
        path = this.getRequestPath(path);
        var reqOpts = Object.assign(options, {
            uri: path,
            agent: getAgent(path),
            method: "POST",
            json: jsonPayload,
        });
        return retry(function () { return request(reqOpts); });
    };
    /** Checks if the configured host is reachable */
    API.prototype.checkConnection = function () {
        return checkConnection(this.hostname);
    };
    return API;
}());
exports.API = API;
// has to be imported here or TypeScript chokes
var api_v1_1 = require("./api-v1");
var api_v5_1 = require("./api-v5");
var api_v6_1 = require("./api-v6");
