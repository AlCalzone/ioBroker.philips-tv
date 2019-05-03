declare global {
    namespace ioBroker {
        interface AdapterConfig {
            host: string;
            username?: string;
            password?: string;
        }
    }
}
export {};
