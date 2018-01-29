import * as request from "request-promise-native";
import { FullResponse, OptionsWithUri, RequestPromiseOptions as RequestOptions } from "request-promise-native";
import { APIv1 } from "./api-v1";
import { APIv5 } from "./api-v5";
import { APIv6 } from "./api-v6";
export { APIv1 } from "./api-v1";

export type APIVersion =
	"unknown"
	| "v1"
	| "v5"
	| "v6"
;

export interface Credentials {
	username: string;
	password: string;
}

/**
 * Common base class for all specialized APIs that support a range of devices
 */
export abstract class API {

	protected constructor(
		/** The hostname this wrapper is bound to */
		public readonly hostname: string,
	) {}

	public static async create(hostname: string): Promise<API> {
		let ret: API;

		async function ensureConnection(api: API) {
			if (!await api.checkConnection()) throw new Error(`No connection to host ${hostname}`);
		}

		for (const apiType of [APIv1, APIv5, APIv6]) {
			ret = new apiType(hostname);
			await ensureConnection(ret);
			if (await ret.test()) return ret;
		}

		throw new Error(`No supported device found at "${hostname}"`);
	}

	/** Tests if a given hostname supports this API version */
	protected abstract async test(): Promise<boolean>;

	/** Determines which API version this wrapper represents */
	abstract get version(): APIVersion;

	/** Whether this API is only usable after pairing */
	public abstract get requiresPairing(): boolean;
	/** Start a pairing process */
	public abstract async startPairing(): Promise<void>;
	/** Start a pairing process and return the required data to complete it */
	public abstract async finishPairing(pinCode: string): Promise<Credentials>;
	/** Provides credentials from a previous pairing process */
	public abstract provideCredentials(credentials: Credentials): void;

	/** The prefix for all http requests */
	protected requestPrefix: string;

	private _params = new Map<string, any>();
	/** Additional params that should be stored over several API uses */
	public get params() {
		return this._params;
	}

	/** Performs a GET request on the given resource and returns the result */
	public async get(path: string, options: RequestOptions = {}): Promise<string | FullResponse> {
		const reqOpts: OptionsWithUri = Object.assign(options, {
			uri: `${this.requestPrefix}${path}`,
		});
		return request(reqOpts);
	}

	/** Performs a GET request on the given resource and returns the result */
	public async getWithDigestAuth(path: string, credentials: Credentials, options: RequestOptions = {}): Promise<string | FullResponse> {
		const reqOpts: OptionsWithUri = Object.assign(options, {
			uri: `${this.requestPrefix}${path}`,
			auth: {
				username: credentials.username,
				password: credentials.password,
				sendImmediately: false,
			},
		});
		return request(reqOpts);
	}

	/** Posts JSON data to the given resource and returns the result */
	public async postJSONwithDigestAuth(path: string, credentials: Credentials, jsonPayload: any, options: RequestOptions = {}): Promise<string> {
		const reqOpts: OptionsWithUri = Object.assign(options, {
			uri: `${this.requestPrefix}${path}`,
			method: "POST",
			json: jsonPayload,
			auth: {
				username: credentials.username,
				password: credentials.password,
				sendImmediately: false,
			},
		});
		return request(reqOpts);
	}

	/** Posts JSON data to the given resource and returns the result */
	public async postJSON(path: string, jsonPayload: any, options: RequestOptions = {}): Promise<string> {
		const reqOpts: OptionsWithUri = Object.assign(options, {
			uri: `${this.requestPrefix}${path}`,
			method: "POST",
			json: jsonPayload,
		});
		return request(reqOpts);
	}

	/** Checks if the configured host is reachable */
	public async checkConnection(): Promise<boolean> {
		try {
			// audio/volume has only a little data,
			// so we use that path to check the connection
			await this.get("", {
				timeout: 5000, // don't wait forever
			});
			return true;
		} catch (e) {
			return false;
		}
	}

}
