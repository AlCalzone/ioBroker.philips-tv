"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var crypto = require("crypto");
var global_1 = require("../lib/global");
var index_1 = require("./index");
// see https://github.com/suborb/philips_android_tv/blob/master/philips.py for pairing procedure
var secret = Buffer.from("ZmVay1EQVFOaZhwQ4Kv81ypLAZNczV9sG4KkseXWn1NEk6cXmPKO/MCa9sryslvLCFMnNe4Z4CPXzToowvhHvA==", "base64");
function sign(data) {
    var hmac = crypto.createHmac("sha", secret);
    hmac.update(data);
    return hmac.digest();
}
var APIv6 = /** @class */ (function (_super) {
    __extends(APIv6, _super);
    function APIv6(hostname) {
        var _this = _super.call(this, hostname) || this;
        _this.version = "v6";
        _this.requestPrefix = "https://" + hostname + ":1926/6/";
        return _this;
    }
    /** Tests if a given hostname supports this API version */
    APIv6.prototype.test = function () {
        return __awaiter(this, void 0, void 0, function () {
            var resp, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, _super.prototype.get.call(this, "audio/volume", {
                                resolveWithFullResponse: true,
                                simple: false,
                            })];
                    case 1:
                        resp = _a.sent();
                        // we expect a 2xx or 401 status code
                        return [2 /*return*/, (resp.statusCode === 401) ||
                                (resp.statusCode >= 200 && resp.statusCode <= 299)];
                    case 2:
                        e_1 = _a.sent();
                        global_1.Global.log("API test for v6 failed. Reason: [" + e_1.code + "] " + e_1.message, "debug");
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /** Creates a new device id or retrieves a stored one */
    APIv6.prototype.getDeviceID = function () {
        if (this.params.has("deviceID"))
            return this.params.get("deviceID");
        // Generate a new ID
        var chars = "abcdefghkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789";
        var ret = "";
        for (var i = 0; i < 16; i++) {
            var index = Math.floor(Math.random() * chars.length);
            ret += chars[index];
        }
        this.params.set("deviceID", ret);
        return ret;
    };
    APIv6.prototype.getDeviceSpec = function () {
        return {
            device_id: this.getDeviceID(),
            device_name: "heliotrope",
            device_os: "Android",
            app_name: "ApplicationName",
            app_id: "app.id",
            type: "native",
        };
    };
    Object.defineProperty(APIv6.prototype, "requiresPairing", {
        get: function () { return true; },
        enumerable: true,
        configurable: true
    });
    APIv6.prototype.startPairing = function () {
        return __awaiter(this, void 0, void 0, function () {
            var requestPayload, response, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        requestPayload = {
                            scope: ["read", "write", "control"],
                            device: this.getDeviceSpec(),
                        };
                        _b = (_a = JSON).parse;
                        return [4 /*yield*/, _super.prototype.postJSON.call(this, "pair/request", requestPayload)];
                    case 1:
                        response = _b.apply(_a, [_c.sent()]);
                        this.pairingContext = {
                            timestamp: response.timestamp,
                            auth_key: response.auth_key,
                            timeout: response.timeout,
                        };
                        return [2 /*return*/];
                }
            });
        });
    };
    APIv6.prototype.finishPairing = function (pinCode) {
        return __awaiter(this, void 0, void 0, function () {
            var auth, requestPayload, credentials;
            return __generator(this, function (_a) {
                if (this.pairingContext == null)
                    throw new Error("No pairing process to finish!");
                auth = {
                    auth_AppId: "1",
                    pin: pinCode,
                    auth_timestamp: this.pairingContext.timestamp,
                    auth_signature: sign(Buffer.concat([
                        secret,
                        Buffer.from(this.pairingContext.timestamp, "utf8"),
                        Buffer.from(pinCode, "utf8"),
                    ])),
                };
                requestPayload = {
                    auth: auth,
                    device: this.getDeviceSpec(),
                };
                credentials = {
                    username: this.getDeviceID(),
                    password: this.pairingContext.auth_key,
                };
                return [2 /*return*/, credentials];
            });
        });
    };
    APIv6.prototype.provideCredentials = function (credentials) {
        this.credentials = credentials;
    };
    // overwrite get/postJSON to use the credentials
    APIv6.prototype.postJSON = function (path, jsonPayload, options) {
        if (options === void 0) { options = {}; }
        return _super.prototype.postJSONwithDigestAuth.call(this, path, this.credentials, jsonPayload, options);
    };
    /** Performs a GET request on the given resource and returns the result */
    APIv6.prototype.get = function (path, options) {
        if (options === void 0) { options = {}; }
        return _super.prototype.getWithDigestAuth.call(this, path, this.credentials, options);
    };
    return APIv6;
}(index_1.API));
exports.APIv6 = APIv6;
