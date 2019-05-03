import { FullResponse, RequestPromiseOptions as RequestOptions } from "request-promise-native";
export declare type APIVersion = "unknown" | "v1" | "v5" | "v6";
export interface Credentials {
    username: string;
    password: string;
}
/**
 * Common base class for all specialized APIs that support a range of devices
 */
export declare abstract class API {
    /** The hostname this wrapper is bound to */
    readonly hostname: string;
    protected constructor(
    /** The hostname this wrapper is bound to */
    hostname: string);
    static create(hostname: string): Promise<API | undefined>;
    /** Tests if a given hostname supports this API version */
    protected abstract test(): Promise<boolean>;
    /** Determines which API version this wrapper represents */
    abstract readonly version: APIVersion;
    /** Whether this API is only usable after pairing */
    abstract readonly requiresPairing: boolean;
    /** Start a pairing process */
    abstract startPairing(): Promise<void>;
    /** Start a pairing process and return the required data to complete it */
    abstract finishPairing(pinCode: string): Promise<Credentials>;
    /** Provides credentials from a previous pairing process */
    abstract provideCredentials(credentials: Credentials): void;
    /** The prefix for all http requests */
    protected requestPrefix: string;
    protected connectionCheckUri: string;
    private _params;
    /** Additional params that should be stored over several API uses */
    readonly params: Map<string, any>;
    private getRequestPath;
    /** Performs a GET request on the given resource and returns the result */
    private _get;
    /** Performs a GET request on the given resource and returns the result */
    get(path: string, options?: RequestOptions): Promise<string | FullResponse>;
    /** Performs a GET request on the given resource and returns the result */
    getWithDigestAuth(path: string, credentials: Credentials, options?: RequestOptions): Promise<string | FullResponse>;
    /** Posts JSON data to the given resource and returns the result */
    postJSONwithDigestAuth(path: string, credentials: Credentials, jsonPayload: any, options?: RequestOptions): Promise<string>;
    /** Posts JSON data to the given resource and returns the result */
    postJSON(path: string, jsonPayload: any, options?: RequestOptions): Promise<string>;
    /** Checks if the configured host is reachable */
    checkConnection(): Promise<boolean>;
}
