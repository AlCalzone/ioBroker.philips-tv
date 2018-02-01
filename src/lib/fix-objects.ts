import * as fs from "fs";
import * as path from "path";
import { Global as _ } from "./global";
import { values } from "./object-polyfill";

// Workaround für unvollständige Adapter-Upgrades
export async function ensureInstanceObjects(): Promise<void> {
	// read io-package.json
	const ioPack = JSON.parse(
		fs.readFileSync(path.join(__dirname, "../../io-package.json"), "utf8"),
	);

	if (ioPack.instanceObjects == null || ioPack.instanceObjects.length === 0) return;

	// wait for all instance objects to be created
	const setObjects = (ioPack.instanceObjects as ioBroker.Object[]).map(
		obj => _.adapter.$setObjectNotExists(obj._id, obj),
	);
	await Promise.all(setObjects);
}
