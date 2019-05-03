import { Global as _ } from "../lib/global";
import { API, APIVersion, Credentials } from "./index";

export class APIv1 extends API {

	public constructor(hostname: string) {
		super(hostname);
		this.requestPrefix = `http://${hostname}:1925/1/`;
	}

	public readonly version: APIVersion = "v1";

	/** Tests if a given hostname supports this API version */
	protected async test(): Promise<boolean> {
		try {
			// audio/volume has only a little data,
			// so we use that path to check the connection
			await this.get("audio/volume", {
				simple: true, // fail the request if it doesn't result in a 2xx code
			});
			return true;
		} catch (e) {
			_.log(`API test for v1 failed. Reason: [${e.code}] ${e.message}`, "debug");
			return false;
		}
	}

	// APIv1 doesn't need pairing
	public get requiresPairing(): boolean { return false; }
	public startPairing(): Promise<void> {
		throw new Error("APIv1 doesn't support pairing!");
	}
	public finishPairing(pinCode: string): Promise<Credentials> {
		throw new Error("APIv1 doesn't support pairing!");
	}
	public provideCredentials(credentials: Credentials): void {
		throw new Error("APIv1 doesn't support pairing!");
	}

}
