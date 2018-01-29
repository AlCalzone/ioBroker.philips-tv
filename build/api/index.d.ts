/// <reference types="request-promise-native" />
import { FullResponse, RequestPromiseOptions as RequestOptions } from "request-promise-native";
export { APIv1 } from "./api-v1";
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
    create(hostname: string): Promise<API>;
    /** Tests if a given hostname supports this API version */
    protected abstract test(): Promise<boolean>;
    /** Determines which API version this wrapper represents */
    readonly abstract version: APIVersion;
    /** Whether this API is only usable after pairing */
    readonly abstract requiresPairing: boolean;
    /** Start a pairing process and return the required data to complete it */
    abstract startPairing(): Promise<Record<string, any>>;
    /** Start a pairing process and return the required data to complete it */
    abstract finishPairing(pinCode: string, additionalInfo: Record<string, any>): Promise<Credentials>;
    /** Provides credentials from a previous pairing process */
    abstract provideCredentials(credentials: Credentials): void;
    /** The prefix for all http requests */
    protected requestPrefix: string;
    /** Performs a GET request on the given resource and returns the result */
    get(path: string, options?: RequestOptions): Promise<string | FullResponse>;
    /** Posts JSON data to the given resource and returns the result */
    postJSON(path: string, jsonPayload: any): Promise<string>;
}
