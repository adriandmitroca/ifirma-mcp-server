import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

export function registerPaymentTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"register_payment",
		"Register a payment for an existing invoice. Records the payment amount and date against the specified invoice.",
		{
			invoiceNumber: z
				.string()
				.describe(
					"Full invoice number (e.g. 'A2/2/2026') — slashes are auto-replaced with underscores",
				),
			invoiceType: z
				.enum([
					"prz_faktura_kraj",
					"prz_faktura_wysylka",
					"prz_faktura_paragon",
					"prz_dostawa_ue_towarow",
					"prz_eksport_towarow",
					"prz_eksport_dost_uslug_ue",
				])
				.default("prz_faktura_kraj")
				.describe("Invoice type"),
			amount: z.number().min(0).describe("Payment amount"),
			paymentDate: z
				.string()
				.optional()
				.describe(
					"Payment date (YYYY-MM-DD) — required for foreign currency and special cash invoices",
				),
			amountPln: z
				.number()
				.optional()
				.describe(
					"Amount in PLN — required when paying a foreign currency invoice in PLN",
				),
			exchangeRate: z
				.number()
				.optional()
				.describe(
					"Exchange rate — required when paying in the invoice's foreign currency",
				),
		},
		async (input) => {
			try {
				const numer = input.invoiceNumber.replace(/\//g, "_");
				const body: Record<string, unknown> = {
					Kwota: input.amount,
				};
				if (input.paymentDate) body.Data = input.paymentDate;
				if (input.amountPln !== undefined) body.KwotaPln = input.amountPln;
				if (input.exchangeRate !== undefined) body.Kurs = input.exchangeRate;
				const result = await client.request({
					method: "POST",
					path: `faktury/wplaty/${input.invoiceType}/${numer}.json`,
					keyName: "faktura",
					body,
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
