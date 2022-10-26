"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_philips_tv_api = require("philips-tv-api");
class PhilipsTvAndroid extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "philips-tv"
    });
    this.pollingInterval = 5e3;
    this.ambilightSupported = false;
    this.ambilightPlusHueSupported = false;
    this.firstPoll = true;
    this.setSourceSupported = false;
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("message", this.onMessage.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  onReady() {
    if (!this.config.ip) {
      this.log.warn("Please specify ip before starting the adapter");
      return;
    }
    if (this.config.pollingInterval) {
      this.pollingInterval = this.config.pollingInterval;
    }
    this.config.apiType = this.config.apiVersion === 6 ? this.config.apiType : "Jointspace";
    this.log.info(`Starting with ip "${this.config.ip}" (API v${this.config.apiVersion} - ${this.config.apiType})`);
    this.subscribeStates("*");
    const auth = {
      user: this.config.apiUser,
      pass: this.config.apiPass,
      sendImmediately: false
    };
    const tvConfig = {
      apiVersion: this.config.apiVersion,
      wakeUntilAPIReadyCounter: 100,
      broadcastIP: this.config.broadcastIp,
      wakeOnLanRequests: 1,
      wakeOnLanTimeout: 1e3,
      apiType: this.config.apiType
    };
    try {
      this.tv = new import_philips_tv_api.PhilipsTV(this.config.ip, this.config.mac, auth, tvConfig, "ioBroker");
      if (!(this.config.apiUser || this.config.apiPass) && this.tv.requiresPairing()) {
        this.log.warn("Please authenticate via the adapter configuration page");
        return;
      }
      this.pollTimer = setTimeout(() => {
        this.pollAPI();
      }, this.pollingInterval);
    } catch (e) {
      this.log.error(`Cannot create API client ${this.errorToText(e)}`);
    }
  }
  async onUnload(callback) {
    try {
      if (this.pollTimer) {
        clearTimeout(this.pollTimer);
      }
      await this.setStateAsync("settings.power", false, true);
      await this.setStateAsync("info.connection", false, true);
      callback();
    } catch {
      callback();
    }
  }
  async onStateChange(id, state) {
    if (!state || state.ack) {
      return;
    }
    this.log.debug(`state change ${id}: ${state.val}`);
    const idParts = id.split(".");
    const command = idParts.pop();
    const channel = idParts.pop();
    if (!this.tv) {
      this.log.warn(`Ignoring state change of "${id}", because TV is not ready`);
      return;
    }
    if (channel === "keys") {
      const keyName = command.charAt(0).toUpperCase() + command.substring(1);
      this.log.debug(`Sending key "${keyName}"`);
      try {
        await this.tv.sendKey(keyName);
      } catch (e) {
        this.log.error(`Could not send key "${keyName}": ${this.errorToText(e)}`);
      }
      return;
    }
    switch (command) {
      case "power":
        try {
          if (this.config.mac && state.val) {
            this.log.debug(`WOL to ${this.config.mac}`);
            await this.tv.turnOn();
          } else {
            await this.tv.setPowerState(state.val);
          }
        } catch (e) {
          this.log.error(`Could not change power state: ${this.errorToText(e)}`);
        }
        break;
      case "volume":
        try {
          await this.tv.setVolume(state.val);
        } catch (e) {
          this.log.error(`Could not change volume: ${this.errorToText(e)}`);
        }
        break;
      case "muted":
        try {
          await this.tv.setMute(state.val);
        } catch (e) {
          this.log.error(`Could not change mute status: ${this.errorToText(e)}`);
        }
        break;
      case "launchApp":
        const appName = state.val;
        if (!this.apps) {
          this.log.error(`No apps cached, cannot launch "${appName}"`);
          return;
        }
        const matchingApp = this.apps.applications.find((entry) => entry.label === appName);
        if (matchingApp) {
          try {
            await this.tv.launchApplication(matchingApp);
          } catch (e) {
            this.log.error(`Could not launch application "${appName}": ${this.errorToText(e)}`);
          }
        } else {
          this.log.error(`Application "${appName}" not found`);
        }
        break;
      case "launchTvChannel":
        const channelName = state.val;
        if (!this.channels) {
          this.log.error(`No channels cached, cannot launch "${channelName}"`);
          return;
        }
        const matchingChannel = this.channels.Channel.find((entry) => entry.name === channelName);
        if (matchingChannel) {
          try {
            const requestedChannel = { channel: matchingChannel };
            const currentChannel = await this.tv.getCurrentTVChannel();
            requestedChannel.channelList = currentChannel.channelList;
            await this.tv.launchTVChannel(requestedChannel);
          } catch (e) {
            this.log.error(`Could not launch TV channel "${channelName}": ${this.errorToText(e)}`);
          }
        } else {
          this.log.error(`Channel "${channelName}" not found`);
        }
        break;
      case "ambilightPlusHueActive":
        try {
          await this.tv.setAmbilightPlusHueState(state.val);
        } catch (e) {
          this.log.error(`Could not change Ambilight + Hue state: ${this.errorToText(e)}`);
        }
        break;
      case "ambilightActive":
        try {
          await this.tv.setAmbilightState(state.val);
        } catch (e) {
          this.log.error(`Could not change Ambilight state: ${this.errorToText(e)}`);
        }
        break;
      case "currentAmbilightConfiguration":
        try {
          await this.tv.sendCustomAmbilightCmd(JSON.parse(state.val));
          await this.setForeignStateAsync(id, state.val, true);
        } catch (e) {
          this.log.error(`Could not set Ambilight configuration: ${this.errorToText(e)}`);
        }
        break;
      case "hdmiInputGoogleAssistant":
        const googleAssistantCommand = {
          intent: {
            extras: { query: `HDMI ${state.val}` },
            action: "Intent {  act=android.intent.action.ASSIST cmp=com.google.android.katniss/com.google.android.apps.tvsearch.app.launch.trampoline.SearchActivityTrampoline flg=0x10200000 }",
            component: {
              packageName: "com.google.android.katniss",
              className: "com.google.android.apps.tvsearch.app.launch.trampoline.SearchActivityTrampoline"
            }
          }
        };
        await this.tv.launchApplication(googleAssistantCommand);
        break;
      case "hdmiInput": {
        await this.tv.setSource(state.val);
        break;
      }
      default:
        this.log.warn(`No command implemented for stateChange of "${id}"`);
    }
  }
  async onMessage(obj) {
    if (typeof obj.message !== "string") {
      this.sendTo(
        obj.from,
        obj.command,
        { error: `Unknown message payload for "${obj.command}": ${JSON.stringify(obj.message)}` },
        obj.callback
      );
      return;
    }
    if (obj.command === "pairing") {
      try {
        await this.startPairing(obj.message);
      } catch (e) {
        if (e.message === "ETIMEDOUT") {
          this.sendTo(obj.from, obj.command, { error: "Timeout" }, obj.callback);
        } else {
          this.sendTo(obj.from, obj.command, { error: e.message }, obj.callback);
        }
      }
    } else if (obj.command === "submitPin") {
      if (!this.authTimestamp) {
        this.sendTo(
          obj.from,
          obj.command,
          { error: "You need to request pairing before you can enter the PIN code" },
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
  async startPairing(ip) {
    this.log.info("Start pairing process");
    this.tv = new import_philips_tv_api.PhilipsTV(ip, void 0, void 0, void 0, "ioBroker");
    const result = await this.tv.requestPair();
    if (typeof result.timestamp === "number") {
      this.authTimestamp = result.timestamp;
    }
  }
  async performAuthentication(timestamp, pin) {
    if (!this.tv) {
      this.log.warn("Pairing needs to be started before performing authentication");
      return;
    }
    const res = await this.tv.authorizePair(timestamp, pin);
    const instanceObj = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
    if (instanceObj) {
      instanceObj.native.apiUser = res.apiUser;
      instanceObj.native.apiPass = res.apiPass;
      await this.setForeignObjectAsync(`system.adapter.${this.namespace}`, instanceObj);
    }
  }
  async pollAPI() {
    if (!this.tv) {
      return;
    }
    try {
      const volumeRes = await this.tv.getVolume();
      await this.setStateAsync("settings.volume", volumeRes.current, true);
      await this.setStateAsync("settings.muted", volumeRes.muted, true);
      const powerRes = await this.tv.getPowerState();
      await this.setStateAsync("settings.power", powerRes.powerstate === "On", true);
      await this.setStateChangedAsync("info.connection", true, true);
      if (this.ambilightSupported) {
        const ambiState = await this.tv.getAmbilightState();
        await this.setStateAsync("settings.ambilightActive", ambiState, true);
        const ambiConfig = await this.tv.getCurrentAmbilightConfiguration();
        await this.setStateAsync("settings.currentAmbilightConfiguration", JSON.stringify(ambiConfig), true);
      }
      if (this.ambilightPlusHueSupported) {
        const ambiHueState = await this.tv.getAmbilightPlusHueState();
        await this.setStateAsync("settings.ambilightPlusHueActive", ambiHueState, true);
      }
      if (this.firstPoll) {
        this.firstPoll = false;
        await this.cacheApps();
        await this.cacheChannels();
        await this.extendObjectAsync("settings.volume", { common: { min: volumeRes.min, max: volumeRes.max } });
        await this.checkSetSourceSupport();
        await this.checkAmbilightPlusHueSupport();
        await this.checkAmbilightSupport();
        await this.syncSystemInfo();
      }
    } catch (e) {
      if (e.code === "ECONNREFUSED" || e.code === "ETIMEDOUT" || e.code === "ESOCKETTIMEDOUT" || e.code === "EHOSTUNREACH") {
        this.log.debug("The TV seems to be turned off");
      } else {
        this.log.error(`Could not poll API: ${this.errorToText(e)}`);
      }
      await this.setStateChangedAsync("settings.power", false, true);
      await this.setStateChangedAsync("info.connection", false, true);
    }
    this.pollTimer = setTimeout(() => {
      this.pollAPI();
    }, this.pollingInterval);
  }
  async cacheApps() {
    try {
      this.apps = await this.tv.getApplications();
      const appLabels = this.apps.applications.map((entry) => entry.label);
      await this.extendObjectAsync("settings.launchApp", {
        type: "state",
        common: {
          role: "text",
          name: "Launch application",
          type: "string",
          read: false,
          write: true,
          states: appLabels
        },
        native: {}
      });
      await this.extendObjectAsync("settings.hdmiInputGoogleAssistant", {
        type: "state",
        common: {
          role: "value",
          name: "Switch HDMI input",
          type: "number",
          read: false,
          write: true
        },
        native: {}
      });
    } catch (e) {
      this.log.debug(`No app launch support: ${this.errorToText(e)}`);
    }
  }
  async cacheChannels() {
    try {
      this.channels = await this.tv.getTVChannels();
      const channelNames = this.channels.Channel.map((entry) => entry.name);
      await this.extendObjectAsync("settings.launchTvChannel", {
        type: "state",
        common: {
          role: "text",
          name: "Launch TV channel",
          type: "string",
          read: false,
          write: true,
          states: channelNames
        },
        native: {}
      });
    } catch (e) {
      this.log.debug(`No channel launch support: ${this.errorToText(e)}`);
    }
  }
  async checkAmbilightSupport() {
    try {
      const ambiHueState = await this.tv.getAmbilightState();
      await this.extendObjectAsync("settings.ambilightActive", {
        type: "state",
        common: {
          role: "switch",
          name: "Ambilight activation status",
          type: "boolean",
          read: true,
          write: true
        },
        native: {}
      });
      await this.extendObjectAsync("settings.currentAmbilightConfiguration", {
        type: "state",
        common: {
          role: "json",
          name: "Send custom Ambilight command",
          type: "string",
          read: false,
          write: true,
          def: '{"styleName":"FOLLOW_VIDEO","isExpert":false,"menuSetting":"GAME"}'
        },
        native: {}
      });
      await this.setStateAsync("settings.ambilightActive", ambiHueState, true);
      this.ambilightSupported = true;
    } catch (e) {
      this.ambilightSupported = false;
      this.log.debug(`No Ambilight plus Hue support: ${this.errorToText(e)}`);
    }
  }
  async checkSetSourceSupport() {
    try {
      if (await this.tv.supportsSetSource()) {
        this.setSourceSupported = true;
        await this.extendObjectAsync("settings.hdmiInput", {
          type: "state",
          common: {
            role: "text",
            name: "Switch source",
            type: "string",
            read: false,
            write: true,
            states: ["HDMI 1", "HDMI 2", "HDMI 3", "HDMI 4"]
          },
          native: {}
        });
      } else {
        this.setSourceSupported = false;
      }
    } catch (e) {
      this.log.warn(`No "setSource" support: ${this.errorToText(e)}`);
      this.setSourceSupported = false;
    }
  }
  async checkAmbilightPlusHueSupport() {
    try {
      const ambiHueState = await this.tv.getAmbilightPlusHueState();
      await this.extendObjectAsync("settings.ambilightPlusHueActive", {
        type: "state",
        common: {
          role: "switch",
          name: "Ambilight + Hue activation status",
          type: "boolean",
          read: true,
          write: true
        },
        native: {}
      });
      await this.setStateAsync("settings.ambilightPlusHueActive", ambiHueState, true);
      this.ambilightPlusHueSupported = true;
    } catch (e) {
      this.ambilightPlusHueSupported = false;
      this.log.debug(`No Ambilight plus Hue support: ${this.errorToText(e)}`);
    }
  }
  async syncSystemInfo() {
    try {
      const res = await this.tv.info();
      await this.extendForeignObjectAsync(this.namespace, {
        type: "device",
        common: {
          name: res.name
        },
        native: res
      });
    } catch (e) {
      this.log.error(`Could not synchronize system information: ${this.errorToText(e)}`);
    }
  }
  errorToText(error) {
    if (error instanceof Error) {
      return error.message;
    } else {
      return JSON.stringify(error);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new PhilipsTvAndroid(options);
} else {
  (() => new PhilipsTvAndroid())();
}
//# sourceMappingURL=main.js.map
