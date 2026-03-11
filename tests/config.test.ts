import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("loads valid config from env vars", () => {
		process.env.IFIRMA_USERNAME = "user@example.pl";
		process.env.IFIRMA_API_KEY_INVOICE = "abc123";

		const config = loadConfig();

		expect(config.username).toBe("user@example.pl");
		expect(config.keys.faktura).toBe("abc123");
	});

	it("throws when username is missing", () => {
		process.env.IFIRMA_API_KEY_INVOICE = "abc123";
		process.env.IFIRMA_USERNAME = undefined;

		expect(() => loadConfig()).toThrow();
	});

	it("throws when no API keys are provided", () => {
		process.env.IFIRMA_USERNAME = "user@example.pl";
		process.env.IFIRMA_API_KEY_INVOICE = undefined;
		process.env.IFIRMA_API_KEY_EXPENSE = undefined;
		process.env.IFIRMA_API_KEY_ACCOUNT = undefined;
		process.env.IFIRMA_API_KEY_RECEIPT = undefined;

		expect(() => loadConfig()).toThrow();
	});

	it("accepts partial key sets", () => {
		process.env.IFIRMA_USERNAME = "user@example.pl";
		process.env.IFIRMA_API_KEY_ACCOUNT = "def456";

		const config = loadConfig();

		expect(config.keys.abonent).toBe("def456");
		expect(config.keys.faktura).toBeUndefined();
	});
});
