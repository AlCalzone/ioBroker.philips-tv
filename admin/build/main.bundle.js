webpackJsonp(["main"],{

/***/ "./admin/src/index.tsx":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// tslint:disable-next-line:no-reference
/// <reference path="../../src/lib/ioBroker.d.ts" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __webpack_require__("./node_modules/react/index.js");
const ReactDOM = __webpack_require__("./node_modules/react-dom/index.js");
const promises_1 = __webpack_require__("./src/lib/promises.ts");
const adapter_1 = __webpack_require__("./admin/src/lib/adapter.ts");
// components
const settings_1 = __webpack_require__("./admin/src/pages/settings.tsx");
const namespace = `philips-tv.${adapter_1.instance}`;
// layout components
function Header() {
    return (React.createElement("h3", { className: "translate", "data-role": "adapter-name" }, adapter_1._("Philips TV adapter settings")));
}
const $emit = promises_1.promisify(adapter_1.socket.emit.bind(adapter_1.socket));
class Root extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            settings: this.props.settings,
            tvInfo: null,
        };
    }
    componentDidMount() {
        // subscribe to the TV state
        adapter_1.socket.emit("subscribe", namespace + ".info.*");
        adapter_1.socket.on("stateChange", (id, state) => {
            if (id.substring(0, namespace.length) !== namespace)
                return;
            console.log(`state changed: ${id} => ${state.val}`);
            const tvInfo = this.state.tvInfo;
            if (id.match(/info\.apiVersion/)) {
                tvInfo.apiVersion = state.val;
                this.setState({ tvInfo });
            }
            else if (id.match(/info\.requiresPairing/)) {
                tvInfo.requiresPairing = state.val;
                this.setState({ tvInfo });
            }
            else if (id.match(/info\.paired/)) {
                tvInfo.paired = state.val;
                this.setState({ tvInfo });
            }
        });
        // and unsubscribe when the window gets unloaded
        adapter_1.$$(window).on("beforeunload", () => {
            adapter_1.socket.emit("unsubscribe", namespace + ".info.*");
            return null;
        });
        // wait for the adapter to get the TV's information
        this.updateTVInfo();
    }
    componentWillUnmount() {
        if (this.updateTimer != null)
            clearInterval(this.updateTimer);
    }
    updateTVInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const states = {
                    apiVersion: yield $emit("getState", `${namespace}.info.apiVersion`),
                    requiresPairing: yield $emit("getState", `${namespace}.info.requiresPairing`),
                    paired: yield $emit("getState", `${namespace}.info.paired`),
                };
                this.setState({
                    tvInfo: {
                        apiVersion: states.apiVersion ? states.apiVersion.val : null,
                        requiresPairing: states.requiresPairing ? states.requiresPairing.val : null,
                        paired: states.paired ? states.paired.val : null,
                    },
                });
            }
            catch (e) {
                console.error(e);
            }
        });
    }
    render() {
        return (React.createElement(React.Fragment, null,
            React.createElement(Header, null),
            React.createElement(settings_1.Settings, { settings: this.state.settings, onChange: this.props.onSettingsChanged, tvInfo: this.state.tvInfo })));
    }
}
exports.Root = Root;
let curSettings;
let originalSettings;
/**
 * Checks if any setting was changed
 */
function hasChanges() {
    for (const key of Object.keys(originalSettings)) {
        if (originalSettings[key] !== curSettings[key])
            return true;
    }
    return false;
}
// the function loadSettings has to exist ...
adapter_1.$window.load = (settings, onChange) => {
    originalSettings = settings;
    const settingsChanged = (newSettings) => {
        curSettings = newSettings;
        onChange(hasChanges());
    };
    ReactDOM.render(React.createElement(Root, { settings: settings, onSettingsChanged: settingsChanged }), document.getElementById("adapter-container"));
    // Signal to admin, that no changes yet
    onChange(false);
};
// ... and the function save has to exist.
// you have to make sure the callback is called with the settings object as first param!
adapter_1.$window.save = (callback) => {
    // save the settings
    callback(curSettings);
    originalSettings = curSettings;
};


/***/ }),

/***/ "./admin/src/lib/adapter.ts":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.$window = window;
exports.$$ = exports.$window.jQuery;
exports.instance = exports.$window.instance || 0;
exports._ = exports.$window._ || ((text) => text);
exports.socket = exports.$window.socket;
exports.sendTo = exports.$window.sendTo;


/***/ }),

/***/ "./admin/src/pages/settings.tsx":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const React = __webpack_require__("./node_modules/react/index.js");
const adapter_1 = __webpack_require__("./admin/src/lib/adapter.ts");
/** Helper component for a settings label */
function Label(props) {
    return React.createElement("label", { htmlFor: props.for, className: (props.class || []).join(" ") },
        adapter_1._(props.text),
        " ");
}
/** Helper component for a tooltip */
function Tooltip(props) {
    return React.createElement("img", { className: "admin-tooltip-icon", src: "../../img/info.png", title: adapter_1._(props.text) });
}
class Settings extends React.Component {
    constructor(props) {
        super(props);
        // settings are our state
        this.state = Object.assign({}, props.settings);
        // remember the original settings
        this.originalSettings = Object.assign({}, props.settings);
        // setup change handlers
        this.handleChange = this.handleChange.bind(this);
    }
    // gets called when the form elements are changed by the user
    handleChange(event) {
        const target = event.target; // TODO: more types
        // store the setting
        this.putSetting(target.id, target.value, () => {
            // and notify the admin UI about changes
            this.props.onChange(this.state);
        });
    }
    /**
     * Reads a setting from the state object and transforms the value into the correct format
     * @param key The setting key to lookup
     */
    getSetting(key) {
        return this.state[key];
    }
    /**
     * Saves a setting in the state object and transforms the value into the correct format
     * @param key The setting key to store at
     */
    putSetting(key, value, callback) {
        this.setState({ [key]: value }, callback);
    }
    render() {
        console.log("rendering... this.props.tvInfo = " + JSON.stringify(this.props.tvInfo));
        return (React.createElement("p", { key: "content", className: "settings-table" },
            React.createElement(Label, { for: "host", text: "Hostname/IP:" }),
            React.createElement(Tooltip, { text: "hostname tooltip" }),
            React.createElement("input", { className: "value", id: "host", value: this.getSetting("host"), onChange: this.handleChange }),
            React.createElement("span", null, adapter_1._("wait for API test")),
            React.createElement("br", null),
            this.props.tvInfo && ((this.props.tvInfo.apiVersion !== "not found") ? (this.props.tvInfo.requiresPairing && (this.props.tvInfo.paired ? (React.createElement("span", null, adapter_1._("connected"))) : (React.createElement("span", null, adapter_1._("needs pairing"))))) : (React.createElement("span", null, adapter_1._("no TV found"))))));
    }
}
exports.Settings = Settings;


/***/ }),

/***/ "./src/lib/promises.ts":
/***/ (function(module, exports, __webpack_require__) {

"use strict";

///
/// Stellt einen Promise-Wrapper für asynchrone Node-Funktionen zur Verfügung
///
Object.defineProperty(exports, "__esModule", { value: true });
function promisify(fn, context) {
    return function (...args) {
        context = context || this;
        return new Promise((resolve, reject) => {
            fn.apply(context, [...args, (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    else {
                        return resolve(result);
                    }
                }]);
        });
    };
}
exports.promisify = promisify;
function promisifyNoError(fn, context) {
    return function (...args) {
        context = context || this;
        return new Promise((resolve) => {
            fn.apply(context, [...args, (result) => {
                    return resolve(result);
                }]);
        });
    };
}
exports.promisifyNoError = promisifyNoError;
// tslint:enable:ban-types
/** Creates a promise that waits for the specified time and then resolves */
function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
exports.wait = wait;


/***/ })

},["./admin/src/index.tsx"]);
//# sourceMappingURL=main.bundle.js.map