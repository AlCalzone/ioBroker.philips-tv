import { FullResponse } from "request-promise-native";
import { API } from "./index";

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

}
