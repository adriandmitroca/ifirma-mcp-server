import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { wrapToolHandler } from "../utils/errors.js";

export function registerVatRateTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"get_eu_vat_rates",
		"Get current VAT rates for an EU country. Returns standard and reduced rates. Use ISO 3166-1 alpha-2 country codes (exception: Greece = EL).",
		{
			countryCode: z
				.string()
				.length(2)
				.describe(
					"ISO 3166-1 alpha-2 country code (e.g. DE, FR, CZ). Greece uses EL.",
				),
			date: z
				.string()
				.optional()
				.describe("Optional date (YYYY-MM-DD) for historical rates"),
		},
		(input) =>
			wrapToolHandler(() =>
				client.request({
					method: "GET",
					path: `slownik/stawki_vat/${encodeURIComponent(input.countryCode)}.json`,
					keyName: "faktura",
					params: input.date ? { data: input.date } : undefined,
				}),
			),
	);
}

export function registerAccountTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"get_accounting_month",
		"Get the currently set accounting month (miesiąc księgowy). Returns the active month and year for bookkeeping operations.",
		{},
		() =>
			wrapToolHandler(() =>
				client.request({
					method: "GET",
					path: "miesiac-ksiegowy.json",
					keyName: "abonent",
				}),
			),
	);

	server.tool(
		"set_accounting_month",
		"Change the active accounting month. This affects which month new invoices and expenses are booked to.",
		{
			month: z.number().min(1).max(12).describe("Month number (1-12)"),
			year: z.number().min(2000).max(2100).describe("Year (e.g. 2026)"),
		},
		(input) =>
			wrapToolHandler(() =>
				client.request({
					method: "PUT",
					path: "miesiac-ksiegowy.json",
					keyName: "abonent",
					body: {
						MiesiacKsiegowy: input.month,
						RokKsiegowy: input.year,
					},
				}),
			),
	);

	server.tool(
		"get_api_limits",
		"Check remaining daily and per-minute API request limits. Useful to monitor usage before bulk operations.",
		{},
		() =>
			wrapToolHandler(() =>
				client.request({
					method: "GET",
					path: "abonent/limit.json",
					keyName: "abonent",
				}),
			),
	);
}
