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
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var request = require("request-promise-native");
// Eigene Module laden
var fix_objects_1 = require("./lib/fix-objects");
var global_1 = require("./lib/global");
// import { wait } from "./lib/promises";
// Adapter-Utils laden
var utils_1 = require("./lib/utils");
// Objekte verwalten
var objects = new Map();
var hostname;
var requestPrefix;
// Adapter-Objekt erstellen
var adapter = utils_1.default.adapter({
    name: "tradfri",
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
                    pingTimer = setInterval(pingThread, 10000);
                    pingThread();
                    return [2 /*return*/];
            }
        });
    }); },
    // Handle sendTo-Messages
    message: function (obj) {
        // TODO
    },
    objectChange: function (id, obj) {
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
    },
    stateChange: function (id, state) { return __awaiter(_this, void 0, void 0, function () {
        var stateObj;
        return __generator(this, function (_a) {
            if (state) {
                global_1.Global.log("{{blue}} state with id " + id + " updated: ack=" + state.ack + "; val=" + state.val, "debug");
            }
            else {
                global_1.Global.log("{{blue}} state with id " + id + " deleted", "debug");
            }
            if (state && !state.ack && id.startsWith(adapter.namespace)) {
                stateObj = objects.get(id);
                // TODO
            }
            else if (!state) {
                // TODO: find out what to do when states are deleted
            }
            return [2 /*return*/];
        });
    }); },
    unload: function (callback) {
        // is called when adapter shuts down - callback has to be called under any circumstances!
        try {
            // stop pinging
            if (pingTimer != null)
                clearInterval(pingTimer);
            // close the connection
            adapter.setState("info.connection", false, true);
            callback();
        }
        catch (e) {
            callback();
        }
    },
});
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
        var e_1;
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
                    e_1 = _a.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function poll() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/];
        });
    });
}
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
                    // see if the connection state has changed
                    if (connectionAlive) {
                        if (!oldValue) {
                            // connection is now alive again
                            global_1.Global.log("The TV with host " + hostname + " was turned on.", "info");
                        }
                        // update information
                        poll();
                    }
                    else {
                        if (oldValue) {
                            // connection is now dead
                            global_1.Global.log("The TV with host " + hostname + " was turned off.", "info");
                        }
                    }
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
