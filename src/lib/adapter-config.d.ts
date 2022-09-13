// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
    namespace ioBroker {
        interface AdapterConfig {
            ip: string;
            apiUser: string;
            apiPass: string;
            broadcastIp: string;
            mac: string;
            apiVersion: number;
            apiType: 'Android' | 'Jointspace';
            pollingInterval: number;
        }
    }
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
