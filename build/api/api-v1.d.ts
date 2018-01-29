import { API, Credentials } from "./index";
export declare class APIv1 extends API {
    create(hostname: string): Promise<APIv1>;
    version: "v1";
    /** Tests if a given hostname supports this API version */
    protected test(): Promise<boolean>;
    readonly requiresPairing: boolean;
    startPairing(): Promise<void>;
    finishPairing(pinCode: string): Promise<Credentials>;
    provideCredentials(credentials: Credentials): void;
}
