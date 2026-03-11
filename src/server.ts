import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IfirmaClient } from "./client/api.js";
import type { Config } from "./config.js";
import { registerAccountTools } from "./tools/account.js";
import { registerContractorTools } from "./tools/contractors.js";
import { registerExpenseTools } from "./tools/expenses.js";
import { registerHrTools } from "./tools/hr.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerKsefTools } from "./tools/ksef.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerPaymentTools } from "./tools/payments.js";

export function createServer(config: Config) {
	const client = new IfirmaClient(config);

	const server = new McpServer({
		name: "ifirma-mcp-server",
		version: "0.1.0",
	});

	if (config.keys.faktura) {
		registerInvoiceTools(server, client);
		registerPaymentTools(server, client);
		registerKsefTools(server, client);
		registerContractorTools(server, client);
	}

	if (config.keys.wydatek) {
		registerExpenseTools(server, client);
	}

	if (config.keys.abonent) {
		registerAccountTools(server, client);
		registerOrderTools(server, client);
		registerHrTools(server, client);
	}

	return server;
}
