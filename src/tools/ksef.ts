import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

export function registerKsefTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"send_invoice_ksef",
		"Submit an invoice to KSeF (Krajowy System e-Faktur — Poland's national e-invoicing system). The invoice must be issued first before submitting to KSeF.",
		{
			invoiceId: z.number().describe("Invoice ID to submit to KSeF"),
		},
		async (input) => {
			try {
				const result = await client.request({
					method: "POST",
					path: `fakturakraj/ksef/send/${input.invoiceId}.json`,
					keyName: "faktura",
					body: { DataWysylki: null },
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
