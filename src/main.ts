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

		pingTimer = setInterval(pingThread, 10000);
		pingThread();

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
			// TODO
		} else if (!state) {
			// TODO: find out what to do when states are deleted
		}

	},

	unload: (callback) => {
		// is called when adapter shuts down - callback has to be called under any circumstances!
		try {
			// stop pinging
			if (pingTimer != null) clearInterval(pingTimer);

			// close the connection
			adapter.setState("info.connection", false, true);

			callback();
		} catch (e) {
			callback();
		}
	},
}) as ExtendedAdapter;

async function GET(path: string): Promise<object> {
	return request(`${requestPrefix}${path}`);
}

async function POST(path: string, jsonPayload: object): Promise<string> {
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

async function poll() {
	// TODO
}

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
			_.log(`The TV with host ${hostname} was turned on.`, "info");
		}
		// update information
		poll();
	} else {
		if (oldValue) {
			// connection is now dead
			_.log(`The TV with host ${hostname} was turned off.`, "info");
		}
	}
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
