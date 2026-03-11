import { beforeEach, describe, expect, it, vi } from "vitest";
import { IfirmaApiError, IfirmaClient } from "../src/client/api.js";
import type { AuthConfig } from "../src/client/auth.js";

describe("IfirmaClient", () => {
	const config: AuthConfig = {
		username: "test@example.pl",
		keys: {
			faktura: "616263646566",
			abonent: "313233343536",
		},
	};

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("constructs correct URL for GET requests", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: "test" }),
		});
		vi.stubGlobal("fetch", mockFetch);

		const client = new IfirmaClient(config);
		await client.request({
			method: "GET",
			path: "fakturakraj/list.json",
			keyName: "faktura",
			params: { limit: "10" },
		});

		const calledUrl = mockFetch.mock.calls[0][0];
		expect(calledUrl).toContain(
			"https://www.ifirma.pl/iapi/fakturakraj/list.json",
		);
		expect(calledUrl).toContain("limit=10");
	});

	it("sends Authentication header", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const client = new IfirmaClient(config);
		await client.request({
			method: "GET",
			path: "test.json",
			keyName: "faktura",
		});

		const headers = mockFetch.mock.calls[0][1].headers;
		expect(headers.Authentication).toMatch(
			/^IAPIS user=test@example\.pl, hmac-sha1=/,
		);
	});

	it("does not send body for GET requests", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const client = new IfirmaClient(config);
		await client.request({
			method: "GET",
			path: "test.json",
			keyName: "faktura",
		});

		expect(mockFetch.mock.calls[0][1].body).toBeUndefined();
	});

	it("sends JSON body for POST requests", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({}),
		});
		vi.stubGlobal("fetch", mockFetch);

		const client = new IfirmaClient(config);
		await client.request({
			method: "POST",
			path: "fakturakraj.json",
			keyName: "faktura",
			body: { test: "data" },
		});

		expect(mockFetch.mock.calls[0][1].body).toBe('{"test":"data"}');
	});

	it("throws IfirmaApiError on non-ok response", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 404,
			text: () => Promise.resolve("Not found"),
		});
		vi.stubGlobal("fetch", mockFetch);

		const client = new IfirmaClient(config);

		await expect(
			client.request({
				method: "GET",
				path: "missing.json",
				keyName: "faktura",
			}),
		).rejects.toThrow(IfirmaApiError);
	});

	it("returns dry-run response when IFIRMA_DRY_RUN is set", async () => {
		process.env.IFIRMA_DRY_RUN = "true";

		const client = new IfirmaClient(config);
		const result = await client.request<Record<string, unknown>>({
			method: "GET",
			path: "test.json",
			keyName: "faktura",
		});

		expect(result._dryRun).toBe(true);
		expect(result.method).toBe("GET");
		expect(result.url).toContain("test.json");

		process.env.IFIRMA_DRY_RUN = undefined;
	});
});
