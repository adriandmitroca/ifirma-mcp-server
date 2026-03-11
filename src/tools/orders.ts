import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

export function registerOrderTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"create_order",
		"Create a new order (zamówienie) in iFirma. Requires at least one line item. Contractor can be specified by NIP or inline details.",
		{
			contractorNip: z
				.string()
				.optional()
				.describe(
					"Contractor NIP — use this to link to an existing contractor",
				),
			contractor: z
				.object({
					name: z.string().describe("Contractor name"),
					nip: z.string().optional().describe("NIP number"),
					street: z.string().optional().describe("Street address"),
					postalCode: z.string().describe("Postal code"),
					city: z.string().describe("City"),
				})
				.optional()
				.describe(
					"Inline contractor details — used when contractorNip is not provided",
				),
			items: z
				.array(
					z.object({
						name: z.string().describe("Product/service name"),
						quantity: z.number().describe("Quantity"),
						unitNetPrice: z.number().describe("Unit net price"),
						vatRate: z
							.number()
							.describe(
								"VAT rate as percentage (e.g. 23) or -1 for exempt (zw)",
							),
						unit: z.string().default("szt.").describe("Unit of measure"),
					}),
				)
				.min(1)
				.describe("Order line items"),
			notes: z.string().optional().describe("Additional notes"),
			deliveryDate: z
				.string()
				.optional()
				.describe("Delivery date in YYYY-MM-DD format"),
		},
		async (input) => {
			try {
				const kontrahent = input.contractorNip
					? { Identyfikator: null, NIP: input.contractorNip }
					: input.contractor
						? {
								Identyfikator: null,
								NIP: input.contractor.nip || "",
								Nazwa: input.contractor.name,
								Ulica: input.contractor.street || "",
								KodPocztowy: input.contractor.postalCode,
								Miejscowosc: input.contractor.city,
							}
						: null;

				const result = await client.request({
					method: "POST",
					path: "zamowienia.json",
					keyName: "abonent",
					body: {
						Zapilesz: true,
						TerminRealizacji: input.deliveryDate || "",
						Uwagi: input.notes || "",
						Pozycje: input.items.map((item) => ({
							StawkaVat: item.vatRate === -1 ? "zw" : item.vatRate / 100,
							Ilosc: item.quantity,
							CenaJednostkowa: item.unitNetPrice,
							NazwaPelna: item.name,
							Jednostka: item.unit,
							TypStawkiVat: item.vatRate === -1 ? "ZW" : "PRC",
						})),
						Kontrahent: kontrahent,
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
}
