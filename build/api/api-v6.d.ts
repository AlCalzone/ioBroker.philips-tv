import { FullResponse, RequestPromiseOptions as RequestOptions } from "request-promise-native";
import { API, APIVersion, Credentials } from "./index";
export declare class APIv6 extends API {
    constructor(hostname: string);
    readonly version: APIVersion;
    /** Tests if a given hostname supports this API version */
    protected test(): Promise<boolean>;
    /** Creates a new device id or retrieves a stored one */
    private getDeviceID;
    private getDeviceSpec;
    private pairingContext;
    readonly requiresPairing: boolean;
    startPairing(): Promise<void>;
    finishPairing(pinCode: string): Promise<Credentials>;
    private credentials;
    provideCredentials(credentials: Credentials): void;
    postJSON(path: string, jsonPayload: any, options?: RequestOptions): Promise<string>;
    /** Performs a GET request on the given resource and returns the result */
    get(path: string, options?: RequestOptions): Promise<string | FullResponse>;
}
