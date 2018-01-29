import { API, Credentials } from "./index";

export class APIv5 extends API {

	public async create(hostname: string): Promise<APIv5> {
		const ret = new APIv5(hostname);
		ret.requestPrefix = `http://${hostname}:1925/5/`;
		return ret;
	}

	public version: "v5";

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
			return false;
		}
	}

	// APIv5 doesn't need pairing
	public get requiresPairing(): boolean { return false; }
	public startPairing(): Promise<void> {
		throw new Error("APIv5 doesn't support pairing!");
	}
	public finishPairing(pinCode: string): Promise<Credentials> {
		throw new Error("APIv5 doesn't support pairing!");
	}
	public provideCredentials(credentials: Credentials): void {
		throw new Error("APIv5 doesn't support pairing!");
	}

}
