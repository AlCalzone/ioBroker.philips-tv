import * as React from "react";
import * as ReactDOM from "react-dom";

import { APIVersion } from "../../../src/api";
import {$$, $window, _, instance} from "../lib/adapter";

export type OnSettingsChangedCallback = (newSettings: Record<string, any>) => void;
export interface TVInfo {
	apiVersion: APIVersion | "not found";
	requiresPairing?: boolean;
	paired?: boolean;
}

interface SettingsProps {
	onChange: OnSettingsChangedCallback;
	settings: Record<string, any>;
	tvInfo: TVInfo;
}

/** Helper component for a settings label */
function Label(props) {
	return <label htmlFor={props.for} className={(props.class || []).join(" ")}>{_(props.text)} </label>;
}
/** Helper component for a tooltip */
function Tooltip(props) {
	return <img className="admin-tooltip-icon" src="../../img/info.png" title={_(props.text)} />;
}

export class Settings extends React.Component<SettingsProps, Record<string, any>> {

	constructor(props: SettingsProps) {
		super(props);
		// settings are our state
		this.state = {
			...props.settings,
		};
		// remember the original settings
		this.originalSettings = {...props.settings};

		// setup change handlers
		this.handleChange = this.handleChange.bind(this);
	}

	private onChange: OnSettingsChangedCallback;
	private originalSettings: Record<string, any>;

	// gets called when the form elements are changed by the user
	private handleChange(event: React.FormEvent<HTMLElement>) {
		const target = event.target as (HTMLInputElement | HTMLSelectElement); // TODO: more types

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
	private getSetting(key: string): string | number | string[] {
		return this.state[key] as any;
	}
	/**
	 * Saves a setting in the state object and transforms the value into the correct format
	 * @param key The setting key to store at
	 */
	private putSetting(key: string, value: string | number | string[], callback?: () => void): void {
		this.setState({[key]: value as any}, callback);
	}

	public render() {
		console.log("rendering... this.props.tvInfo = " + JSON.stringify(this.props.tvInfo));
		return (
			<p key="content" className="settings-table">
				<Label for="host" text="Hostname/IP:" />
				<Tooltip text="hostname tooltip" />
				<input className="value" id="host" value={this.getSetting("host")} onChange={this.handleChange} />
				<span>{_("wait for API test")}</span>
				<br />

				{this.props.tvInfo && ((this.props.tvInfo.apiVersion !== "not found") ? (
					this.props.tvInfo.requiresPairing && (
						this.props.tvInfo.paired ? (
							<span>{_("connected")}</span>
						) : (
							<span>{_("needs pairing")}</span>
						)
					)
				) : (
					<span>{_("no TV found")}</span>
				))}
			</p>
		);
	}
}
