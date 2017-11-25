"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:unified-signatures
// tslint:disable:no-var-requires
var fs = require("fs");
// Get js-controller directory to load libs
function getControllerDir(isInstall) {
    // Find the js-controller location
    var ctrlrDir = __dirname.replace(/\\/g, "/");
    ctrlrDir = ctrlrDir.split("/");
    if (ctrlrDir[ctrlrDir.length - 4] === "adapter") {
        ctrlrDir.splice(ctrlrDir.length - 4, 4);
        ctrlrDir = ctrlrDir.join("/");
    }
    else if (ctrlrDir[ctrlrDir.length - 4] === "node_modules") {
        ctrlrDir.splice(ctrlrDir.length - 4, 4);
        ctrlrDir = ctrlrDir.join("/");
        if (fs.existsSync(ctrlrDir + "/node_modules/iobroker.js-controller")) {
            ctrlrDir += "/node_modules/iobroker.js-controller";
        }
        else if (fs.existsSync(ctrlrDir + "/node_modules/ioBroker.js-controller")) {
            ctrlrDir += "/node_modules/ioBroker.js-controller";
        }
        else if (!fs.existsSync(ctrlrDir + "/controller.js")) {
            if (!isInstall) {
                console.log("Cannot find js-controller");
                process.exit(10);
            }
            else {
                process.exit();
            }
        }
    }
    else {
        if (!isInstall) {
            console.log("Cannot find js-controller");
            process.exit(10);
        }
        else {
            process.exit();
        }
    }
    return ctrlrDir;
}
// Read controller configuration file
var controllerDir = getControllerDir(typeof process !== "undefined" && process.argv && process.argv.indexOf("--install") !== -1);
function getConfig() {
    return JSON.parse(fs.readFileSync(controllerDir + "/conf/iobroker.json", "utf8"));
}
var adapter = require(controllerDir + "/lib/adapter.js");
exports.default = {
    controllerDir: controllerDir,
    getConfig: getConfig,
    adapter: adapter,
};
//# sourceMappingURL=utils.js.map