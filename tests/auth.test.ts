import { describe, expect, it } from "vitest";
import { computeAuthHeader } from "../src/client/auth.js";
import type { AuthConfig } from "../src/client/auth.js";

describe("computeAuthHeader", () => {
	const config: AuthConfig = {
		username: "test@example.pl",
		keys: {
			faktura: "616263646566",
			abonent: "313233343536",
		},
	};

	it("computes HMAC-SHA1 for a simple URL", () => {
		const header = computeAuthHeader(
			config,
			"faktura",
			"https://www.ifirma.pl/iapi/fakturakraj/list.json",
			"",
		);

		expect(header).toMatch(
			/^IAPIS user=test@example\.pl, hmac-sha1=[a-f0-9]{40}$/,
		);
	});

	it("strips query params from URL for signing", () => {
		const headerWithParams = computeAuthHeader(
			config,
			"faktura",
			"https://www.ifirma.pl/iapi/fakturakraj/list.json?limit=10&offset=0",
			"",
		);

		const headerWithoutParams = computeAuthHeader(
			config,
			"faktura",
			"https://www.ifirma.pl/iapi/fakturakraj/list.json",
			"",
		);

		expect(headerWithParams).toBe(headerWithoutParams);
	});

	it("includes request body in HMAC computation", () => {
		const headerNoBody = computeAuthHeader(
			config,
			"faktura",
			"https://www.ifirma.pl/iapi/fakturakraj.json",
			"",
		);

		const headerWithBody = computeAuthHeader(
			config,
			"faktura",
			"https://www.ifirma.pl/iapi/fakturakraj.json",
			'{"test":"data"}',
		);

		expect(headerNoBody).not.toBe(headerWithBody);
	});

	it("uses correct key for each scope", () => {
		const fakturaHeader = computeAuthHeader(
			config,
			"faktura",
			"https://www.ifirma.pl/iapi/test.json",
			"",
		);

		const abonentHeader = computeAuthHeader(
			config,
			"abonent",
			"https://www.ifirma.pl/iapi/test.json",
			"",
		);

		expect(fakturaHeader).not.toBe(abonentHeader);
	});

	it("throws when key is missing for scope", () => {
		expect(() =>
			computeAuthHeader(
				config,
				"wydatek",
				"https://www.ifirma.pl/iapi/test.json",
				"",
			),
		).toThrow("Missing API key for scope: wydatek");
	});

	it("produces deterministic output", () => {
		const header1 = computeAuthHeader(
			config,
			"faktura",
			"https://www.ifirma.pl/iapi/fakturakraj.json",
			'{"key":"value"}',
		);

		const header2 = computeAuthHeader(
			config,
			"faktura",
			"https://www.ifirma.pl/iapi/fakturakraj.json",
			'{"key":"value"}',
		);

		expect(header1).toBe(header2);
	});
});
