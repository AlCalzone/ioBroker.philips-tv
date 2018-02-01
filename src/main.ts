// polyfill NodeJS 4 buffer functions
// tslint:disable-next-line:no-var-requires
require("buffer-v6-polyfill");

import * as request from "request-promise-native";

// Eigene Module laden
import { API, Credentials } from "./api/index";
import { ensureInstanceObjects } from "./lib/fix-objects";
import { ExtendedAdapter, Global as _ } from "./lib/global";
import { composeObject, entries, values } from "./lib/object-polyfill";
// import { wait } from "./lib/promises";

// Adapter-Utils laden
import utils from "./lib/utils";

// Objekte verwalten
const objects = new Map<string, ioBroker.Object>();

let api: API;
let hostname: string;
let credentials: Credentials;

// Adapter-Objekt erstellen
let adapter: ExtendedAdapter = utils.adapter({
	name: "philips-tv",

	// Wird aufgerufen, wenn Adapter initialisiert wird
	ready: async () => {

		// Adapter-Instanz global machen
		adapter = _.extend(adapter);
		_.adapter = adapter;

		// Fix our adapter objects to repair incompatibilities between versions
		await ensureInstanceObjects();

		// we're not connected yet!
		await adapter.setState("info.connection", false, true);

		// Sicherstellen, dass die Optionen vollständig ausgefüllt sind.
		if (adapter.config && adapter.config.host != null && adapter.config.host !== "") {
			// alles gut
			hostname = adapter.config.host;
		} else {
			adapter.log.error("Please set the connection params in the adapter options before starting the adapter!");
			return;
		}

		credentials = {
			username: adapter.config.username || "",
			password: adapter.config.password || "",
		};

		// watch own states
		adapter.subscribeStates(`${adapter.namespace}.*`);
		adapter.subscribeObjects(`${adapter.namespace}.*`);

		setImmediate(pingThread);

	},

	// Handle sendTo-Messages
	message: (obj: ioBroker.Message) => {
		// TODO
	},

	objectChange: (id, obj) => {
		_.log(`{{blue}} object with id ${id} ${obj ? "updated" : "deleted"}`, "debug");

		if (id.startsWith(adapter.namespace)) {
			// this is our own object.

			if (obj) {
				// object modified or added

				// remember it
				objects.set(id, obj);
			} else {
				// object deleted
				if (objects.has(id)) objects.delete(id);
			}

		}

	},

	stateChange: async (id, state) => {
		if (state) {
			_.log(`{{blue}} state with id ${id} updated: ack=${state.ack}; val=${state.val}`, "debug");
		} else {
			_.log(`{{blue}} state with id ${id} deleted`, "debug");
		}

		if (state && !state.ack && id.startsWith(adapter.namespace)) {
			// our own state was changed from within ioBroker, react to it

			if (!connectionAlive) {
				adapter.log.warn(`Not connected to the TV - can't handle state change ${id}`);
				return;
			}

			const stateObj = objects.get(id);
			let wasAcked: boolean = false;
			let endpoint: string;
			let payload: any;
			if (/\.muted$/.test(id)) {
				// mute/unmute the TV
				endpoint = "audio/volume";
				payload = { muted: state.val };
			} else if (/\.volume$/.test(id)) {
				// change the volume
				endpoint = "audio/volume";
				payload = { current: state.val };
			} else if (/\.pressKey$/.test(id)) {
				// send a key press to the TV
				endpoint = "input/key";
				payload = { key: state.val };
			}

			if (endpoint != null && payload != null) {
				try {
					const result = await api.postJSON(endpoint, payload);
					wasAcked = (result != null) && (result.indexOf("Ok") > -1);
				} catch (e) {
					_.log(`Error handling state change ${id} => ${state.val}: ${e.message}`, "error");
				}

				// ACK the state if necessary
				if (wasAcked) {
					await adapter.$setState(id, state, true);
				}
			}
		} else if (!state) {
			// TODO: find out what to do when states are deleted
		}

	},

	unload: (callback) => {
		// is called when adapter shuts down - callback has to be called under any circumstances!
		try {
			// stop pinging
			if (pingTimer != null) clearTimeout(pingTimer);

			// close the connection
			adapter.setState("info.connection", false, true);

			callback();
		} catch (e) {
			callback();
		}
	},
}) as ExtendedAdapter;

/**
 * Requests information from the TV. Has to be called periodically.
 */
async function poll(): Promise<void> {
	// TODO
	await Promise.all([
		requestAudio(),
	]);
}

async function requestAudio() {
	try {
		const result = JSON.parse(await api.get("audio/volume") as string);

		// update muted state
		await extendObject("muted", { // alive state
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
		});
		await adapter.$setStateChanged(`${adapter.namespace}.muted`, result.muted, true);

		// update volume state
		await extendObject("volume", { // alive state
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
		});
		await adapter.$setStateChanged(`${adapter.namespace}.volume`, result.current, true);
	} catch (e) { /* it's ok */ }
}

async function extendObject(objId: string, obj: ioBroker.Object) {
	const oldObj = await adapter.$getObject(objId);
	const newObj = Object.assign({}, oldObj, obj);
	if (JSON.stringify(newObj) !== JSON.stringify(oldObj)) {
		await adapter.$setObject(objId, newObj);
	}
}

// ========================================

// Connection check
let pingTimer: NodeJS.Timer;
let connectionAlive: boolean = false;

async function pingThread() {

	const oldValue = connectionAlive;

	// if this is the first time connecting to the TV, determine the API version
	if (api == null) {
		try {
			adapter.log.debug(`initializing connection to ${hostname}`);
			api = await API.create(hostname);
			// check if we need credentials and also have them
			if (api.requiresPairing && (credentials.username === "" || credentials.password === "")) {
				adapter.log.warn(`The TV at ${hostname} needs to be paired before you can use the adapter. Go to the adapter config to continue!`);
				return;
			}
			connectionAlive = true;
		} catch (e) {
			adapter.log.debug(`Could not initialize connection. Reason: ${e.message}`);
			connectionAlive = false;
		}
	} else {
		connectionAlive = await api.checkConnection();
	}

	await adapter.$setStateChanged("info.connection", connectionAlive, true);

	// see if the connection state has changed
	if (connectionAlive) {
		if (!oldValue) {
			// connection is now alive again
			_.log(`The TV at ${hostname} is now reachable.`, "info");
		}
		// update information
		await poll();
	} else {
		if (oldValue) {
			// connection is now dead
			_.log(`The TV at ${hostname} is not reachable anymore.`, "info");
		}
	}

	pingTimer = setTimeout(pingThread, 10000);
}

// Unbehandelte Fehler tracen
function getMessage(err: Error | string): string {
	// Irgendwo gibt es wohl einen Fehler ohne Message
	if (err == null) return "undefined";
	if (typeof err === "string") return err;
	if (err.message != null) return err.message;
	if (err.name != null) return err.name;
	return err.toString();
}
process.on("unhandledRejection", (err: Error) => {
	adapter.log.error("unhandled promise rejection: " + getMessage(err));
	if (err.stack != null) adapter.log.error("> stack: " + err.stack);
});
process.on("uncaughtException", (err: Error) => {
	adapter.log.error("unhandled exception:" + getMessage(err));
	if (err.stack != null) adapter.log.error("> stack: " + err.stack);
	process.exit(1);
});
