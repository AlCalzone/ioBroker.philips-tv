import * as request from "request-promise-native";

// Eigene Module laden
import { ensureInstanceObjects } from "./lib/fix-objects";
import { ExtendedAdapter, Global as _ } from "./lib/global";
import { composeObject, DictionaryLike, entries, values } from "./lib/object-polyfill";
// import { wait } from "./lib/promises";

// Adapter-Utils laden
import utils from "./lib/utils";

// Objekte verwalten
const objects = new Map<string, ioBroker.Object>();

let hostname: string;
let requestPrefix: string;

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
		} else {
			adapter.log.error("Please set the connection params in the adapter options before starting the adapter!");
			return;
		}
		hostname = (adapter.config.host as string).toLowerCase();
		requestPrefix = `http://${hostname}:1925/1/`;

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
			}

			if (endpoint != null && payload != null) {
				try {
					const result = await POST(endpoint, payload);
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

async function GET(path: string): Promise<any> {
	return request(`${requestPrefix}${path}`);
}

async function POST(path: string, jsonPayload: any): Promise<string> {
	return request({
		uri: `${requestPrefix}${path}`,
		method: "POST",
		json: jsonPayload,
	});
}

/**
 * Checks if the TV is reachable
 */
async function checkConnection(): Promise<boolean> {
	try {
		// audio/volume has only a little data,
		// so we use that path to check the connection
		await GET("audio/volume");
		return true;
	} catch (e) {
		return false;
	}
}

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
		const result = JSON.parse(await GET("audio/volume"));

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
			native: { },
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
			native: { },
		});
		await adapter.$setStateChanged(`${adapter.namespace}.volume`, result.current, true);
	} catch (e) { /* it's ok */ }
}

async function extendObject(objId: string, obj: ioBroker.Object) {
	const oldObj = await adapter.$getObject(objId);
	const newObj = Object.assign(Object.assign({}, oldObj), obj);
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
	connectionAlive = await checkConnection();
	await adapter.$setStateChanged("info.connection", connectionAlive, true);

	// see if the connection state has changed
	if (connectionAlive) {
		if (!oldValue) {
			// connection is now alive again
			_.log(`The TV with host ${hostname} is now reachable.`, "info");
		}
		// update information
		await poll();
	} else {
		if (oldValue) {
			// connection is now dead
			_.log(`The TV with host ${hostname} is not reachable anymore.`, "info");
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
