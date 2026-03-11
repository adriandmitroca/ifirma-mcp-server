import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

export function registerAccountTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"get_accounting_month",
		"Get the currently set accounting month (miesiąc księgowy). Returns the active month and year for bookkeeping operations.",
		{},
		async () => {
			try {
				const result = await client.request({
					method: "GET",
					path: "miesiac-ksiegowy.json",
					keyName: "abonent",
				});

				return {
					content: [
						{ type: "text" as const, text: JSON.stringify(result, null, 2) },
					],
				};
			} catch (error) {
				return {
					content: [{ type: "text" as const, text: formatToolError(error) }],
					isError: true,
				};
			}
		},
	);

	server.tool(
		"set_accounting_month",
		"Change the active accounting month. This affects which month new invoices and expenses are booked to.",
		{
			month: z.number().min(1).max(12).describe("Month number (1-12)"),
			year: z.number().min(2000).max(2100).describe("Year (e.g. 2026)"),
		},
		async (input) => {
			try {
				const result = await client.request({
					method: "PUT",
					path: "miesiac-ksiegowy.json",
					keyName: "abonent",
					body: {
						MiesiacKsiegowy: input.month,
						RokKsiegowy: input.year,
					},
				});

				return {
					content: [
						{ type: "text" as const, text: JSON.stringify(result, null, 2) },
					],
				};
			} catch (error) {
				return {
					content: [{ type: "text" as const, text: formatToolError(error) }],
					isError: true,
				};
			}
		},
	);

	server.tool(
		"get_api_limits",
		"Check remaining daily and per-minute API request limits. Useful to monitor usage before bulk operations.",
		{},
		async () => {
			try {
				const result = await client.request({
					method: "GET",
					path: "limit.json",
					keyName: "abonent",
				});

				return {
					content: [
						{ type: "text" as const, text: JSON.stringify(result, null, 2) },
					],
				};
			} catch (error) {
				return {
					content: [{ type: "text" as const, text: formatToolError(error) }],
					isError: true,
				};
			}
		},
	);

	server.tool(
		"get_eu_vat_rates",
		"Get current VAT rates for all EU countries. Returns standard and reduced rates per country.",
		{},
		async () => {
			try {
				const result = await client.request({
					method: "GET",
					path: "stawki-vat-ue.json",
					keyName: "abonent",
				});

				return {
					content: [
						{ type: "text" as const, text: JSON.stringify(result, null, 2) },
					],
				};
			} catch (error) {
				return {
					content: [{ type: "text" as const, text: formatToolError(error) }],
					isError: true,
				};
			}
		},
	);
}
