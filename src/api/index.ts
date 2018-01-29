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

	public async create(hostname: string): Promise<API> {
		let ret: API;
		// try all possibilities

		// v1
		ret = new APIv1(hostname);
		if (await ret.test()) return ret;

		// v5
		ret = new APIv5(hostname);
		if (await ret.test()) return ret;

		// v6
		ret = new APIv6(hostname);
		if (await ret.test()) return ret;

		throw new Error(`No supported device found at "${hostname}"`);
	}

	/** Tests if a given hostname supports this API version */
	protected abstract async test(): Promise<boolean>;

	/** Determines which API version this wrapper represents */
	abstract get version(): APIVersion;

	/** Whether this API is only usable after pairing */
	public abstract get requiresPairing(): boolean;
	/** Start a pairing process and return the required data to complete it */
	public abstract async startPairing(): Promise<Record<string, any>>;
	/** Start a pairing process and return the required data to complete it */
	public abstract async finishPairing(pinCode: string, additionalInfo: Record<string, any>): Promise<Credentials>;
	/** Provides credentials from a previous pairing process */
	public abstract provideCredentials(credentials: Credentials): void;

	/** The prefix for all http requests */
	protected requestPrefix: string;

	/** Performs a GET request on the given resource and returns the result */
	public async get(path: string, options: RequestOptions = {}): Promise<string | FullResponse> {
		const reqOpts: OptionsWithUri = Object.assign(options, {
			uri: `${this.requestPrefix}${path}`,
		});
		return request(reqOpts);
	}

	/** Posts JSON data to the given resource and returns the result */
	public async postJSON(path: string, jsonPayload: any): Promise<string> {
		return request({
			uri: `${this.requestPrefix}${path}`,
			method: "POST",
			json: jsonPayload,
		});
	}

}
