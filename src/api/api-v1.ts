import { API, Credentials } from "./index";

export class APIv1 extends API {

	public async create(hostname: string): Promise<APIv1> {
		const ret = new APIv1(hostname);
		ret.requestPrefix = `http://${hostname}:1925/1/`;
		return ret;
	}

	public version: "v1";

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
