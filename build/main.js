"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var request = require("request-promise-native");
// Eigene Module laden
var fix_objects_1 = require("./lib/fix-objects");
var global_1 = require("./lib/global");
// Adapter-Utils laden
var utils = require("@iobroker/adapter-core");
// Objekte verwalten
var objects = new Map();
var hostname;
var requestPrefix;
var adapter;
function startAdapter(options) {
    var _this = this;
    if (options === void 0) { options = {}; }
    return adapter = utils.adapter(__assign({}, options, { 
        // Custom options
        name: "philips-tv", 
        // Wird aufgerufen, wenn Adapter initialisiert wird
        ready: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Adapter-Instanz global machen
                        adapter = global_1.Global.extend(adapter);
                        global_1.Global.adapter = adapter;
                        // Fix our adapter objects to repair incompatibilities between versions
                        return [4 /*yield*/, fix_objects_1.ensureInstanceObjects()];
                    case 1:
                        // Fix our adapter objects to repair incompatibilities between versions
                        _a.sent();
                        // we're not connected yet!
                        return [4 /*yield*/, adapter.setState("info.connection", false, true)];
                    case 2:
                        // we're not connected yet!
                        _a.sent();
                        // Sicherstellen, dass die Optionen vollständig ausgefüllt sind.
                        if (adapter.config && adapter.config.host != null && adapter.config.host !== "") {
                            // alles gut
                        }
                        else {
                            adapter.log.error("Please set the connection params in the adapter options before starting the adapter!");
                            return [2 /*return*/];
                        }
                        hostname = adapter.config.host.toLowerCase();
                        requestPrefix = "http://" + hostname + ":1925/1/";
                        // watch own states
                        adapter.subscribeStates(adapter.namespace + ".*");
                        adapter.subscribeObjects(adapter.namespace + ".*");
                        setImmediate(pingThread);
                        return [2 /*return*/];
                }
            });
        }); }, 
        // Handle sendTo-Messages
        message: function (obj) {
            // TODO
        }, objectChange: function (id, obj) {
            global_1.Global.log("{{blue}} object with id " + id + " " + (obj ? "updated" : "deleted"), "debug");
            if (id.startsWith(adapter.namespace)) {
                // this is our own object.
                if (obj) {
                    // object modified or added
                    // remember it
                    objects.set(id, obj);
                }
                else {
                    // object deleted
                    if (objects.has(id))
                        objects.delete(id);
                }
            }
        }, stateChange: function (id, state) { return __awaiter(_this, void 0, void 0, function () {
            var stateObj, wasAcked, endpoint, payload, result, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (state) {
                            global_1.Global.log("{{blue}} state with id " + id + " updated: ack=" + state.ack + "; val=" + state.val, "debug");
                        }
                        else {
                            global_1.Global.log("{{blue}} state with id " + id + " deleted", "debug");
                        }
                        if (!(state && !state.ack && id.startsWith(adapter.namespace))) return [3 /*break*/, 7];
                        stateObj = objects.get(id);
                        wasAcked = false;
                        endpoint = void 0;
                        payload = void 0;
                        if (/\.muted$/.test(id)) {
                            // mute/unmute the TV
                            endpoint = "audio/volume";
                            payload = { muted: state.val };
                        }
                        else if (/\.volume$/.test(id)) {
                            // change the volume
                            endpoint = "audio/volume";
                            payload = { current: state.val };
                        }
                        else if (/\.pressKey$/.test(id)) {
                            // send a key press to the TV
                            endpoint = "input/key";
                            payload = { key: state.val };
                        }
                        if (!(endpoint != null && payload != null)) return [3 /*break*/, 6];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, POST(endpoint, payload)];
                    case 2:
                        result = _a.sent();
                        wasAcked = (result != null) && (result.indexOf("Ok") > -1);
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        global_1.Global.log("Error handling state change " + id + " => " + state.val + ": " + e_1.message, "error");
                        return [3 /*break*/, 4];
                    case 4:
                        if (!wasAcked) return [3 /*break*/, 6];
                        return [4 /*yield*/, adapter.$setState(id, state, true)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        if (!state) {
                            // TODO: find out what to do when states are deleted
                        }
                        _a.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        }); }, unload: function (callback) {
            // is called when adapter shuts down - callback has to be called under any circumstances!
            try {
                // stop pinging
                if (pingTimer != null)
                    clearTimeout(pingTimer);
                // close the connection
                adapter.setState("info.connection", false, true);
                callback();
            }
            catch (e) {
                callback();
            }
        } }));
}
function GET(path) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, request("" + requestPrefix + path)];
        });
    });
}
function POST(path, jsonPayload) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, request({
                    uri: "" + requestPrefix + path,
                    method: "POST",
                    json: jsonPayload,
                })];
        });
    });
}
/**
 * Checks if the TV is reachable
 */
function checkConnection() {
    return __awaiter(this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    // audio/volume has only a little data,
                    // so we use that path to check the connection
                    return [4 /*yield*/, GET("audio/volume")];
                case 1:
                    // audio/volume has only a little data,
                    // so we use that path to check the connection
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    e_2 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Requests information from the TV. Has to be called periodically.
 */
function poll() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // TODO
                return [4 /*yield*/, Promise.all([
                        requestAudio(),
                    ])];
                case 1:
                    // TODO
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function requestAudio() {
    return __awaiter(this, void 0, void 0, function () {
        var result, _a, _b, e_3;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 6, , 7]);
                    _b = (_a = JSON).parse;
                    return [4 /*yield*/, GET("audio/volume")];
                case 1:
                    result = _b.apply(_a, [_c.sent()]);
                    // update muted state
                    return [4 /*yield*/, extendObject("muted", {
                            _id: adapter.namespace + ".muted",
                            type: "state",
                            common: {
                                name: "muted",
                                read: true,
                                write: true,
                                type: "boolean",
                                role: "value.muted",
                                desc: "Indicates if the TV is muted",
                            },
                            native: {},
                        })];
                case 2:
                    // update muted state
                    _c.sent();
                    return [4 /*yield*/, adapter.$setStateChanged(adapter.namespace + ".muted", result.muted, true)];
                case 3:
                    _c.sent();
                    // update volume state
                    return [4 /*yield*/, extendObject("volume", {
                            _id: adapter.namespace + ".volume",
                            type: "state",
                            common: {
                                name: "volume",
                                read: true,
                                write: true,
                                type: "number",
                                min: result.min,
                                max: result.max,
                                role: "value.volume",
                            },
                            native: {},
                        })];
                case 4:
                    // update volume state
                    _c.sent();
                    return [4 /*yield*/, adapter.$setStateChanged(adapter.namespace + ".volume", result.current, true)];
                case 5:
                    _c.sent();
                    return [3 /*break*/, 7];
                case 6:
                    e_3 = _c.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function extendObject(objId, obj) {
    return __awaiter(this, void 0, void 0, function () {
        var oldObj, newObj;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, adapter.$getObject(objId)];
                case 1:
                    oldObj = _a.sent();
                    newObj = Object.assign(Object.assign({}, oldObj), obj);
                    if (!(JSON.stringify(newObj) !== JSON.stringify(oldObj))) return [3 /*break*/, 3];
                    return [4 /*yield*/, adapter.$setObject(objId, newObj)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ========================================
// Connection check
var pingTimer;
var connectionAlive = false;
function pingThread() {
    return __awaiter(this, void 0, void 0, function () {
        var oldValue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    oldValue = connectionAlive;
                    return [4 /*yield*/, checkConnection()];
                case 1:
                    connectionAlive = _a.sent();
                    return [4 /*yield*/, adapter.$setStateChanged("info.connection", connectionAlive, true)];
                case 2:
                    _a.sent();
                    if (!connectionAlive) return [3 /*break*/, 4];
                    if (!oldValue) {
                        // connection is now alive again
                        global_1.Global.log("The TV with host " + hostname + " is now reachable.", "info");
                    }
                    // update information
                    return [4 /*yield*/, poll()];
                case 3:
                    // update information
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    if (oldValue) {
                        // connection is now dead
                        global_1.Global.log("The TV with host " + hostname + " is not reachable anymore.", "info");
                    }
                    _a.label = 5;
                case 5:
                    pingTimer = setTimeout(pingThread, 10000);
                    return [2 /*return*/];
            }
        });
    });
}
// Unbehandelte Fehler tracen
function getMessage(err) {
    // Irgendwo gibt es wohl einen Fehler ohne Message
    if (err == null)
        return "undefined";
    if (typeof err === "string")
        return err;
    if (err.message != null)
        return err.message;
    if (err.name != null)
        return err.name;
    return err.toString();
}
process.on("unhandledRejection", function (err) {
    adapter.log.error("unhandled promise rejection: " + getMessage(err));
    if (err.stack != null)
        adapter.log.error("> stack: " + err.stack);
});
process.on("uncaughtException", function (err) {
    adapter.log.error("unhandled exception:" + getMessage(err));
    if (err.stack != null)
        adapter.log.error("> stack: " + err.stack);
    process.exit(1);
});
if (module.parent) {
    module.exports = startAdapter;
}
else {
    startAdapter();
}
