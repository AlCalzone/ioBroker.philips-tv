import { expect } from "chai";
import { composeObject, entries, filter, values } from "./object-polyfill";
// tslint:disable:no-unused-expression

describe("lib/object-polyfill => values() =>", () => {

	const source = {a: "A", b: "B", c: "C"};

	it("should return the array of values", () => {
		expect(values(source)).to.deep.equal(["A", "B", "C"]);
	});

	it("should work for empty objects", () => {
		expect(values({})).to.deep.equal([]);
	});

});

describe("lib/object-polyfill => entries() =>", () => {

	const source = {a: "A", b: "B", c: "C"};

	it("should return the array of [key, value] pairs", () => {
		expect(entries(source)).to.deep.equal([["a", "A"], ["b", "B"], ["c", "C"]]);
	});

	it("should work for empty objects", () => {
		expect(entries({})).to.deep.equal([]);
	});

});

describe("lib/object-polyfill => composeObject() =>", () => {

	const _entries: [string, string][] = [["a", "A"], ["b", "B"], ["c", "C"]];
	const expected = {a: "A", b: "B", c: "C"};

	it("should turn an array of [key, value] pairs into an object", () => {
		expect(composeObject(_entries)).to.deep.equal(expected);
	});

	it("should overwrite duplicates", () => {
		const dupes = _entries.concat([["a", "F"]]);
		const expectedWithDupes = {a: "F", b: "B", c: "C"};
		expect(composeObject(dupes)).to.deep.equal(expectedWithDupes);
	});

	it("should work for empty arrays", () => {
		expect(composeObject([])).to.deep.equal({});
	});

});

describe("lib/object-polyfill => filter() =>", () => {

	const source = {a: 1, b: 2, c: 3};

	it("should return only the properties matching the filter", () => {
		expect(filter(source, v => v >= 2)).to.deep.equal({ b: 2, c: 3 });
	});

	it("should work correctly with an impossible filter", () => {
		expect(filter(source, () => false)).to.deep.equal({ });
	});

	it("should work for empty objects", () => {
		expect(filter({}, () => true)).to.deep.equal({});
	});

});
