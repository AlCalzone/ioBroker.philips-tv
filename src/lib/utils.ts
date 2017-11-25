// tslint:disable:unified-signatures
// tslint:disable:no-var-requires
import * as fs from "fs";

// Get js-controller directory to load libs
function getControllerDir(isInstall): string {
	// Find the js-controller location
	let ctrlrDir: string | string[] = __dirname.replace(/\\/g, "/");
	ctrlrDir = ctrlrDir.split("/");
	if (ctrlrDir[ctrlrDir.length - 4] === "adapter") {
		ctrlrDir.splice(ctrlrDir.length - 4, 4);
		ctrlrDir = ctrlrDir.join("/");
	} else if (ctrlrDir[ctrlrDir.length - 4] === "node_modules") {
		ctrlrDir.splice(ctrlrDir.length - 4, 4);
		ctrlrDir = ctrlrDir.join("/");
		if (fs.existsSync(ctrlrDir + "/node_modules/iobroker.js-controller")) {
			ctrlrDir += "/node_modules/iobroker.js-controller";
		} else if (fs.existsSync(ctrlrDir + "/node_modules/ioBroker.js-controller")) {
			ctrlrDir += "/node_modules/ioBroker.js-controller";
		} else if (!fs.existsSync(ctrlrDir + "/controller.js")) {
			if (!isInstall) {
				console.log("Cannot find js-controller");
				process.exit(10);
			} else {
				process.exit();
			}
		}
	} else {
		if (!isInstall) {
			console.log("Cannot find js-controller");
			process.exit(10);
		} else {
			process.exit();
		}
	}
	return ctrlrDir as string;
}

// Read controller configuration file
const controllerDir = getControllerDir(typeof process !== "undefined" && process.argv && process.argv.indexOf("--install") !== -1);
function getConfig() {
	return JSON.parse(fs.readFileSync(controllerDir + "/conf/iobroker.json", "utf8"));
}

const adapter = require(controllerDir + "/lib/adapter.js");

export default {
	controllerDir: controllerDir,
	getConfig: getConfig,
	adapter: adapter,
} as {
	readonly controllerDir: string;
	getConfig(): string;
	adapter(adapterName: string): ioBroker.Adapter;
	adapter(adapterOptions: ioBroker.AdapterOptions): ioBroker.Adapter;
};
