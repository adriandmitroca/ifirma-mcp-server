import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { wrapToolHandler } from "../utils/errors.js";

export function registerKsefTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"send_invoice_ksef",
		"Submit an invoice to KSeF (Krajowy System e-Faktur — Poland's national e-invoicing system). The invoice must be issued first before submitting to KSeF.",
		{
			invoiceId: z.number().describe("Invoice ID to submit to KSeF"),
		},
		(input) =>
			wrapToolHandler(() =>
				client.request({
					method: "POST",
					path: `fakturakraj/ksef/send/${input.invoiceId}.json`,
					keyName: "faktura",
					body: { DataWysylki: null },
				}),
			),
	);
}
