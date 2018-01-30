import * as request from "request-promise-native";
import { FullResponse, OptionsWithUri, RequestPromiseOptions as RequestOptions } from "request-promise-native";

import { ExtendedAdapter, Global as _ } from "../lib/global";

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

		_.log("detecting API version", "debug");

		for (const apiType of [APIv1, APIv5, APIv6]) {
			_.log("testing " + apiType.name, "debug");
			ret = new apiType(hostname);
			await ensureConnection(ret);
			if (await ret.test()) {
				_.log(`TV has ${apiType.name}`, "debug");
				return ret;
			}
		}

		throw new Error(`No supported device/API version found at "${hostname}"`);
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
	private _get(path: string, options: RequestOptions = {}): Promise<string | FullResponse> {
		const reqOpts: OptionsWithUri = Object.assign(options, {
			uri: `${this.requestPrefix}${path}`,
		});
		return request(reqOpts) as any as Promise<string | FullResponse>;
	}

	/** Performs a GET request on the given resource and returns the result */
	public get(path: string, options: RequestOptions = {}): Promise<string | FullResponse> {
		return this._get(path, options);
	}

	/** Performs a GET request on the given resource and returns the result */
	public getWithDigestAuth(path: string, credentials: Credentials, options: RequestOptions = {}): Promise<string | FullResponse> {
		const reqOpts: OptionsWithUri = Object.assign(options, {
			uri: `${this.requestPrefix}${path}`,
			auth: {
				username: credentials.username,
				password: credentials.password,
				sendImmediately: false,
			},
		});
		return request(reqOpts) as any as Promise<string | FullResponse>;
	}

	/** Posts JSON data to the given resource and returns the result */
	public postJSONwithDigestAuth(path: string, credentials: Credentials, jsonPayload: any, options: RequestOptions = {}): Promise<string> {
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
		return request(reqOpts) as any as Promise<string>;
	}

	/** Posts JSON data to the given resource and returns the result */
	public postJSON(path: string, jsonPayload: any, options: RequestOptions = {}): Promise<string> {
		const reqOpts: OptionsWithUri = Object.assign(options, {
			uri: `${this.requestPrefix}${path}`,
			method: "POST",
			json: jsonPayload,
		});
		return request(reqOpts) as any as Promise<string>;
	}

	/** Checks if the configured host is reachable */
	public async checkConnection(): Promise<boolean> {
		_.log("checking if connection is alive", "debug");
		try {
			// We always use the non-overwritten version for this as
			// we might not have credentials yet.
			await this._get("", {
				timeout: 5000, // don't wait forever
				simple: false, // connection is successful even with an error status code
			});
			_.log("connection is ALIVE", "debug");
			return true;
		} catch (e) {
			// handle a couple of possible errors
			switch (e.code) {
				case "ECONNREFUSED":
				case "ECONNRESET":
					// the remote host is there, but it won't let us connect
					// e.g. when trying to connect to port 1925 on a v6 TV
					_.log("connection is ALIVE, but remote host won't let us connect", "debug");
					return true;
				case "ETIMEDOUT":
				default:
					_.log(`connection is DEAD. Reason: [${e.code}] ${e.message}`, "debug");
					return false;
			}
		}
	}

}

// has to be imported here or TypeScript chokes
import { APIv1 } from "./api-v1";
import { APIv5 } from "./api-v5";
import { APIv6 } from "./api-v6";
