import { APIVersion } from "../api";
export interface TVInfo {
    apiVersion: APIVersion | "not found";
    requiresPairing?: boolean;
    isPaired?: boolean;
}
