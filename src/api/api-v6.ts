import * as crypto from "crypto";
import { FullResponse } from "request-promise-native";
import { API, Credentials } from "./index";

// see https://github.com/suborb/philips_android_tv/blob/master/philips.py for pairing procedure

const secret = Buffer.from("ZmVay1EQVFOaZhwQ4Kv81ypLAZNczV9sG4KkseXWn1NEk6cXmPKO/MCa9sryslvLCFMnNe4Z4CPXzToowvhHvA==", "base64");

function sign(data: Buffer): Buffer {
	const hmac = crypto.createHmac("sha", secret);
	hmac.update(data);
	return hmac.digest();
}

export class APIv6 extends API {

	public async create(hostname: string): Promise<APIv6> {
		const ret = new APIv6(hostname);
		ret.requestPrefix = `https://${hostname}:1925/6/`;
		return ret;
	}

	public version: "v6";

	/** Tests if a given hostname supports this API version */
	protected async test(): Promise<boolean> {
		try {
			// audio/volume has only a little data,
			// so we use that path to check the connection
			const resp = await this.get("audio/volume", {
				resolveWithFullResponse: true, // we want to check the status code
			}) as FullResponse;
			// we expect a 2xx or 401 status code
			return (resp.statusCode === 401) ||
				(resp.statusCode >= 200 && resp.statusCode <= 299)
				;
		} catch (e) {
			return false;
		}
	}

	/** Creates a new device id or retrieves a stored one */
	private getDeviceID(): string {
		if (this.params.has("deviceID")) return this.params.get("deviceID");
		// Generate a new ID
		const chars = "abcdefghkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789";
		let ret = "";
		for (let i = 0; i < 16; i++) {
			const index = Math.floor(Math.random() * chars.length);
			ret += chars[index];
		}
		this.params.set("deviceID", ret);
		return ret;
	}

	private getDeviceSpec() {
		return {
			device_id: this.getDeviceID(),
			device_name: "heliotrope",
			device_os: "Android",
			app_name: "ApplicationName",
			app_id: "app.id",
			type: "native",
		};
	}

	private pairingContext: Record<string, any>;

	public get requiresPairing(): boolean { return true; }

	public async startPairing(): Promise<void> {
		const requestPayload = {
			scope: ["read", "write", "control"],
			device: this.getDeviceSpec(),
		};
		const response = JSON.parse(await this.postJSON("pair/request", requestPayload));
		this.pairingContext = {
			timestamp: response.timestamp,
			auth_key: response.auth_key,
			timeout: response.timeout,
		};
	}

	public async finishPairing(pinCode: string): Promise<Credentials> {
		if (this.pairingContext == null) throw new Error("No pairing process to finish!");

		const auth = {
			auth_AppId: "1",
			pin: pinCode,
			auth_timestamp: this.pairingContext.timestamp,
			auth_signature: sign(Buffer.concat([
				secret,
				Buffer.from(this.pairingContext.timestamp, "utf8"),
				Buffer.from(pinCode, "utf8"),
			])),
		};
		const requestPayload = {
			auth,
			device: this.getDeviceSpec(),
		};

		const credentials: Credentials = {
			username: this.getDeviceID(),
			password: this.pairingContext.auth_key,
		};
		const response = JSON.parse(await this.postJSONwithDigestAuth("pair/grant", credentials, requestPayload));

		return credentials;
	}

	private credentials: Credentials;
	public provideCredentials(credentials: Credentials): void {
		this.credentials = credentials;
	}

}
