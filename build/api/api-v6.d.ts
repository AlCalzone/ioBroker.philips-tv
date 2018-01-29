import { API, Credentials } from "./index";
export declare class APIv6 extends API {
    create(hostname: string): Promise<APIv6>;
    version: "v6";
    /** Tests if a given hostname supports this API version */
    protected test(): Promise<boolean>;
    /** Creates a new device id or retrieves a stored one */
    private getDeviceID();
    private getDeviceSpec();
    private pairingContext;
    readonly requiresPairing: boolean;
    startPairing(): Promise<void>;
    finishPairing(pinCode: string): Promise<Credentials>;
    private credentials;
    provideCredentials(credentials: Credentials): void;
}
