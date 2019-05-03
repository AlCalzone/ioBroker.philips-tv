// tslint:disable-next-line:no-reference

// root objects
import * as $ from "jquery";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { promisify } from "../../src/lib/promises";
import { $$, $window, _, instance, sendTo, socket } from "./lib/adapter";

// components
import { OnSettingsChangedCallback, Settings, TVInfo } from "./pages/settings";

const namespace = `philips-tv.${instance}`;

// layout components
function Header() {
	return (
		<h3 className="translate" data-role="adapter-name">{_("Philips TV adapter settings")}</h3>
	);
}

const $emit = promisify<any>(socket.emit.bind(socket));

export class Root extends React.Component<any, { tvInfo: TVInfo, settings: Record<string, any> }> {

	constructor(props) {
		super(props);
		this.state = {
			settings: this.props.settings,
			tvInfo: null,
		};
	}

	private updateTimer;

	public componentDidMount() {
		// subscribe to the TV state
		socket.emit("subscribe", namespace + ".info.*");
		socket.on("stateChange", (id: string, state: ioBroker.State) => {
			if (id.substring(0, namespace.length) !== namespace) return;
			console.log(`state changed: ${id} => ${state.val}`);
			const tvInfo = this.state.tvInfo;
			if (id.match(/info\.apiVersion/)) {
				tvInfo.apiVersion = state.val;
				this.setState({ tvInfo });
			} else if (id.match(/info\.requiresPairing/)) {
				tvInfo.requiresPairing = state.val;
				this.setState({ tvInfo });
			} else if (id.match(/info\.paired/)) {
				tvInfo.paired = state.val;
				this.setState({ tvInfo });
			}
		});
		// and unsubscribe when the window gets unloaded
		$$(window).on("beforeunload", () => {
			socket.emit("unsubscribe", namespace + ".info.*");
			return null;
		});

		// wait for the adapter to get the TV's information
		this.updateTVInfo();
	}

	public componentWillUnmount() {
		if (this.updateTimer != null) clearInterval(this.updateTimer);
	}

	public async updateTVInfo() {
		try {
			const states = {
				apiVersion: await $emit("getState", `${namespace}.info.apiVersion`),
				requiresPairing: await $emit("getState", `${namespace}.info.requiresPairing`),
				paired: await $emit("getState", `${namespace}.info.paired`),
			};
			this.setState({
				tvInfo: {
					apiVersion: states.apiVersion ? states.apiVersion.val : null,
					requiresPairing: states.requiresPairing ? states.requiresPairing.val : null,
					paired: states.paired ? states.paired.val : null,
				},
			});
		} catch (e) {
			console.error(e);
		}
	}

	public render() {
		return (
			<>
				<Header />
				<Settings settings={this.state.settings} onChange={this.props.onSettingsChanged} tvInfo={this.state.tvInfo} />
			</>
		);
	}

}

let curSettings: Record<string, any>;
let originalSettings: Record<string, any>;

/**
 * Checks if any setting was changed
 */
function hasChanges(): boolean {
	for (const key of Object.keys(originalSettings)) {
		if (originalSettings[key] !== curSettings[key]) return true;
	}
	return false;
}

// the function loadSettings has to exist ...
$window.load = (settings, onChange) => {

	originalSettings = settings;

	const settingsChanged: OnSettingsChangedCallback = (newSettings) => {
		curSettings = newSettings;
		onChange(hasChanges());
	};

	ReactDOM.render(
		<Root settings={settings} onSettingsChanged={settingsChanged} />,
		document.getElementById("adapter-container"),
	);

	// Signal to admin, that no changes yet
	onChange(false);
};

// ... and the function save has to exist.
// you have to make sure the callback is called with the settings object as first param!
$window.save = (callback) => {
	// save the settings
	callback(curSettings);
	originalSettings = curSettings;
};
