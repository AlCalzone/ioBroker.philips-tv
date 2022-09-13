import * as utils from '@iobroker/adapter-core';
import { PhilipsTV, Authentication, PhilipsTVConfig } from '@konradknitter/philipsandroidtv';

interface ApplicationCache {
    version: number;
    applications: Application[];
}

interface Application {
    /** Application name */
    label: string;
    intent: IntentObject;
    order: number;
    id: string;
    type: string;
}

interface IntentObject {
    component: {
        packageName: string;
        className: string;
    };
    action: string;
}

interface VolumeObject {
    current: number;
    min: number;
    max: number;
    muted: boolean;
}

interface PowerObject {
    powerstate: 'On' | 'Standby';
}

interface TVCache {
    version: number;
    id: string;
    listType: string;
    medium: string;
    operator: string;
    installCountry: string;
    Channel: Channel[];
}

interface Channel {
    ccid: number;
    preset: string;
    name: string;
    onid: number;
    tsid: number;
    sid: number;
    serviceType: string;
    type: string;
    logoVersion: number;
}

interface ActiveChannelObject {
    channel: Channel;
    channelList: ChannelList;
}

interface ChannelList {
    id: string;
    version: string;
}

class PhilipsTvAndroid extends utils.Adapter {
    private tv: PhilipsTV | undefined;
    private pollingInterval = 5_000;
    private authTimestamp: number | undefined;
    private pollTimer: NodeJS.Timer | undefined;
    private apps: ApplicationCache | undefined;
    private channels: TVCache | undefined;
    private ambilightSupported = false;
    private ambilightPlusHueSupported = false;
    private firstPoll = true;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'philips-tv'
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    private onReady(): void {
        if (!this.config.ip) {
            this.log.warn('Please specify ip before starting the adapter');
            return;
        }

        if (this.config.pollingInterval) {
            this.pollingInterval = this.config.pollingInterval;
        }

        // Ensure that v1 and v5 are only selected as Jointspace
        this.config.apiType = this.config.apiVersion === 6 ? this.config.apiType : 'Jointspace';

        this.log.info(`Starting with ip "${this.config.ip}" (API v${this.config.apiVersion} - ${this.config.apiType})`);

        this.subscribeStates('*');

        const auth: Authentication = {
            user: this.config.apiUser,
            pass: this.config.apiPass,
            sendImmediately: false
        };

        const tvConfig: PhilipsTVConfig = {
            apiVersion: this.config.apiVersion,
            wakeUntilAPIReadyCounter: 100,
            broadcastIP: this.config.broadcastIp,
            wakeOnLanRequests: 1,
            wakeOnLanTimeout: 1_000,
            apiType: this.config.apiType
        };

        try {
            this.tv = new PhilipsTV(this.config.ip, this.config.mac, auth, tvConfig, 'ioBroker');

            if (!(this.config.apiUser || this.config.apiPass) && this.tv.requiresPairing()) {
                this.log.warn('Please authenticate via the adapter configuration page');
                return;
            }

            this.pollTimer = setTimeout(() => {
                this.pollAPI();
            }, this.pollingInterval);
        } catch (e) {
            this.log.error(`Cannot create API client ${this.errorToText(e)}`);
        }
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    private async onUnload(callback: () => void): Promise<void> {
        try {
            if (this.pollTimer) {
                clearTimeout(this.pollTimer);
            }

            await this.setStateAsync('settings.power', false, true);
            await this.setStateAsync('info.connection', false, true);

            callback();
        } catch {
            callback();
        }
    }

    /**
     * Is called if a subscribed state changes
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (!state || state.ack) {
            return;
        }
        this.log.debug(`state change ${id}: ${state.val}`);

        const idParts = id.split('.');

        const command = idParts.pop() as string;
        const channel = idParts.pop() as string;

        if (!this.tv) {
            this.log.warn(`Ignoring state change of "${id}", because TV is not ready`);
            return;
        }

        if (command === 'power') {
            try {
                if (this.config.mac && state.val) {
                    this.log.debug(`WOL to ${this.config.mac}`);
                    await this.tv.turnOn();
                } else {
                    await this.tv.setPowerState(state.val as boolean);
                }
            } catch (e) {
                this.log.error(`Could not change power state: ${this.errorToText(e)}`);
            }
        } else if (channel === 'keys') {
            const keyName = command.charAt(0).toUpperCase() + command.substring(1);
            this.log.debug(`Sending key "${keyName}"`);
            try {
                await this.tv.sendKey(keyName);
            } catch (e) {
                this.log.error(`Could not send key "${keyName}": ${this.errorToText(e)}`);
            }
        } else if (command === 'volume') {
            try {
                await this.tv.setVolume(state.val as number);
            } catch (e) {
                this.log.error(`Could not change volume: ${this.errorToText(e)}`);
            }
        } else if (command === 'muted') {
            try {
                await this.tv.setMute(state.val as boolean);
            } catch (e) {
                this.log.error(`Could not change mute status: ${this.errorToText(e)}`);
            }
        } else if (command === 'launchApp') {
            const appName = state.val as string;

            if (!this.apps) {
                this.log.error(`No apps cached, cannot launch "${appName}"`);
                return;
            }

            const matchingApp = this.apps.applications.find(entry => entry.label === appName);

            if (matchingApp) {
                try {
                    await this.tv.launchApplication(matchingApp as any);
                } catch (e) {
                    this.log.error(`Could not launch application "${appName}": ${this.errorToText(e)}`);
                }
            } else {
                this.log.error(`Application "${appName}" not found`);
            }
        } else if (command === 'launchTvChannel') {
            const channelName = state.val as string;

            if (!this.channels) {
                this.log.error(`No channels cached, cannot launch "${channelName}"`);
                return;
            }

            const matchingChannel = this.channels.Channel.find(entry => entry.name === channelName);

            if (matchingChannel) {
                try {
                    const requestedChannel: Partial<ActiveChannelObject> = { channel: matchingChannel };

                    const currentChannel = (await this.tv.getCurrentTVChannel()) as ActiveChannelObject;
                    requestedChannel.channelList = currentChannel.channelList;

                    await this.tv.launchTVChannel(requestedChannel as any);
                } catch (e) {
                    this.log.error(`Could not launch TV channel "${channelName}": ${this.errorToText(e)}`);
                }
            } else {
                this.log.error(`Channel "${channelName}" not found`);
            }
        } else if (command === 'ambilightPlusHueActive') {
            try {
                await this.tv.setAmbilightPlusHueState(state.val as boolean);
            } catch (e) {
                this.log.error(`Could not change Ambilight + Hue state: ${this.errorToText(e)}`);
            }
        } else if (command === 'ambilightActive') {
            try {
                await this.tv.setAmbilightState(state.val as boolean);
            } catch (e) {
                this.log.error(`Could not change Ambilight state: ${this.errorToText(e)}`);
            }
        } else if (command === 'customAmbilightCommand') {
            try {
                await this.tv.sendCustomAmbilightCmd(JSON.parse(state.val as string));
                await this.setForeignStateAsync(id, state.val, true);
            } catch (e) {
                this.log.error(`Could not send custom Ambilight command: ${this.errorToText(e)}`);
            }
        } else {
            this.log.warn(`No command implemented for stateChange of "${id}"`);
        }
    }

    /**
     * Handle messages send to this instance
     * @param obj the message object
     */
    private async onMessage(obj: ioBroker.Message): Promise<void> {
        if (typeof obj.message !== 'string') {
            this.sendTo(
                obj.from,
                obj.command,
                { error: `Unknown message payload for "${obj.command}": ${JSON.stringify(obj.message)}` },
                obj.callback
            );
            return;
        }

        if (obj.command === 'pairing') {
            try {
                await this.startPairing(obj.message);
            } catch (e: any) {
                if (e.message === 'ETIMEDOUT') {
                    this.sendTo(obj.from, obj.command, { error: 'Timeout' }, obj.callback);
                } else {
                    this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
                }
            }
        } else if (obj.command === 'submitPin') {
            if (!this.authTimestamp) {
                this.sendTo(
                    obj.from,
                    obj.command,
                    { error: 'You need to request pairing before you can enter the PIN code' },
                    obj.callback
                );
                return;
            }
            try {
                await this.performAuthentication(this.authTimestamp, obj.message);
            } catch (e) {
                this.sendTo(obj.from, obj.command, { error: this.errorToText(e) }, obj.callback);
            }
        }

        this.sendTo(obj.from, obj.command, {}, obj.callback);
    }

    /**
     * Starts the pairing procedure
     *
     * @param ip address to pair with
     */
    private async startPairing(ip: string): Promise<void> {
        this.log.info('Start pairing process');

        this.tv = new PhilipsTV(ip, undefined, undefined, undefined, 'ioBroker');
        const result = await this.tv.requestPair();
        if (typeof result.timestamp === 'number') {
            this.authTimestamp = result.timestamp;
        }
    }

    /**
     * Performs the authentication with given pin
     * @param timestamp timestamp of pairing request
     * @param pin pin shown on tv
     */
    private async performAuthentication(timestamp: number, pin: string): Promise<void> {
        if (!this.tv) {
            this.log.warn('Pairing needs to be started before performing authentication');
            return;
        }
        const res = await this.tv.authorizePair(timestamp as any, pin);
        // res.apiUser and res.apiPass
        const instanceObj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
        if (instanceObj) {
            instanceObj.native.apiUser = res.apiUser;
            instanceObj.native.apiPass = res.apiPass;
            await this.setForeignObjectAsync(`system.adapter.${this.namespace}`, instanceObj);
        }
    }

    /**
     * Polls states from API and syncs them to ioBroker
     */
    private async pollAPI(): Promise<void> {
        if (!this.tv) {
            return;
        }

        try {
            const volumeRes: VolumeObject = await this.tv.getVolume();
            await this.setStateAsync('settings.volume', volumeRes.current, true);
            await this.setStateAsync('settings.muted', volumeRes.muted, true);

            const powerRes: PowerObject = await this.tv.getPowerState();
            await this.setStateAsync('settings.power', powerRes.powerstate === 'On', true);
            await this.setStateChangedAsync('info.connection', true, true);

            if (this.ambilightSupported) {
                const ambiState = await this.tv.getAmbilightState();
                await this.setStateAsync('settings.ambilightActive', ambiState, true);
            }

            if (this.ambilightPlusHueSupported) {
                const ambiHueState = await this.tv.getAmbilightPlusHueState();
                await this.setStateAsync('settings.ambilightPlusHueActive', ambiHueState, true);
            }

            if (this.firstPoll) {
                // do this only once per run
                this.firstPoll = false;
                await this.cacheApps();
                await this.cacheChannels();

                // also extend the min/max correctly for volume once
                await this.extendObjectAsync('settings.volume', { common: { min: volumeRes.min, max: volumeRes.max } });
                await this.checkAmbilightPlusHueSupport();
                await this.checkAmbilightSupport();
                await this.syncSystemInfo();
            }
        } catch (e: any) {
            if (
                e.code === 'ECONNREFUSED' ||
                e.code === 'ETIMEDOUT' ||
                e.code === 'ESOCKETTIMEDOUT' ||
                e.code === 'EHOSTUNREACH'
            ) {
                this.log.debug('The TV seems to be turned off');
            } else {
                this.log.error(`Could not poll API: ${this.errorToText(e)}`);
            }
            await this.setStateChangedAsync('settings.power', false, true);
            await this.setStateChangedAsync('info.connection', false, true);
        }

        this.pollTimer = setTimeout(() => {
            this.pollAPI();
        }, this.pollingInterval);
    }

    /**
     * Cache apps and ensure object has the cached information
     */
    private async cacheApps(): Promise<void> {
        try {
            this.apps = (await this.tv!.getApplications()) as ApplicationCache;
            const appLabels = this.apps.applications.map(entry => entry.label);
            await this.extendObjectAsync('settings.launchApp', {
                type: 'state',
                common: {
                    role: 'text',
                    name: 'Launch application',
                    type: 'string',
                    read: true,
                    write: true,
                    states: appLabels
                },
                native: {}
            });
        } catch (e) {
            this.log.debug(`No app launch support: ${this.errorToText(e)}`);
        }
    }

    /**
     * Cache channels and ensure object has the cached information
     */
    private async cacheChannels(): Promise<void> {
        try {
            this.channels = (await this.tv!.getTVChannels()) as TVCache;
            const channelNames = this.channels.Channel.map(entry => entry.name);
            await this.extendObjectAsync('settings.launchTvChannel', {
                type: 'state',
                common: {
                    role: 'text',
                    name: 'Launch TV channel',
                    type: 'string',
                    read: true,
                    write: true,
                    states: channelNames
                },
                native: {}
            });
        } catch (e) {
            this.log.debug(`No channel launch support: ${this.errorToText(e)}`);
        }
    }

    /**
     * Checks if the TV supports ambilight, if so the state is created an flag is set
     */
    private async checkAmbilightSupport(): Promise<void> {
        try {
            const ambiHueState = await this.tv!.getAmbilightState();

            await this.extendObjectAsync('settings.ambilightActive', {
                type: 'state',
                common: {
                    role: 'switch',
                    name: 'Ambilight activation status',
                    type: 'boolean',
                    read: true,
                    write: true
                },
                native: {}
            });

            await this.extendObjectAsync('settings.customAmbilightCommand', {
                type: 'state',
                common: {
                    role: 'json',
                    name: 'Send custom Ambilight command',
                    type: 'string',
                    read: false,
                    write: true,
                    def: '{"styleName":"FOLLOW_VIDEO","isExpert":false,"menuSetting":"GAME"}'
                },
                native: {}
            });

            await this.setStateAsync('settings.ambilightActive', ambiHueState, true);
            this.ambilightSupported = true;
        } catch (e) {
            this.ambilightSupported = false;
            this.log.debug(`No Ambilight plus Hue support: ${this.errorToText(e)}`);
        }
    }

    /**
     * Checks if the TV supports ambilight plus Hue, if so the state is created an flag is set
     */
    private async checkAmbilightPlusHueSupport(): Promise<void> {
        try {
            const ambiHueState = await this.tv!.getAmbilightPlusHueState();

            await this.extendObjectAsync('settings.ambilightPlusHueActive', {
                type: 'state',
                common: {
                    role: 'switch',
                    name: 'Ambilight + Hue activation status',
                    type: 'boolean',
                    read: true,
                    write: true
                },
                native: {}
            });

            await this.setStateAsync('settings.ambilightPlusHueActive', ambiHueState, true);
            this.ambilightPlusHueSupported = true;
        } catch (e) {
            this.ambilightPlusHueSupported = false;
            this.log.debug(`No Ambilight plus Hue support: ${this.errorToText(e)}`);
        }
    }

    private async syncSystemInfo(): Promise<void> {
        try {
            const res = await this.tv!.info();
            await this.extendForeignObjectAsync(this.namespace, {
                // @ts-expect-error we are allowed to create this as device
                type: 'device',
                common: {
                    name: 'Philips TV'
                },
                native: res
            });
        } catch (e) {
            this.log.error(`Could not synchronize system information: ${this.errorToText(e)}`);
        }
    }

    /**
     * Checks if a real error was thrown and returns message, else it stringifies
     *
     * @param error any kind of thrown error
     */
    private errorToText(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        } else {
            return JSON.stringify(error);
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new PhilipsTvAndroid(options);
} else {
    // otherwise start the instance directly
    (() => new PhilipsTvAndroid())();
}
