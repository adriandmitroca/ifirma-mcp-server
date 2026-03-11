import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { IfirmaClient } from "./client/api.js";
import type { Config } from "./config.js";
import { registerAccountTools, registerVatRateTools } from "./tools/account.js";
import { registerContractorTools } from "./tools/contractors.js";
import { registerExpenseTools } from "./tools/expenses.js";
import { registerHrTools } from "./tools/hr.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerKsefTools } from "./tools/ksef.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerPaymentTools } from "./tools/payments.js";

const SERVER_INSTRUCTIONS = `You are connected to the iFirma.pl accounting API — a Polish online bookkeeping platform for small businesses (JDG).

## Key context
- All monetary amounts are in PLN (Polish Złoty) unless specified otherwise.
- Dates use YYYY-MM-DD format.
- API responses use Polish field names. Common mappings:
  - NazwaKontrahenta = contractor name
  - DataWystawienia = issue date
  - DataSprzedazy = sale date
  - PelnyNumer = full invoice number (e.g. "A2/2/2026")
  - Brutto = gross amount
  - Netto = net amount
  - Zaplacono = amount paid
  - TerminPlatnosci = payment deadline
  - CzySzkic = is draft
  - FakturaId = invoice ID
  - NIPKontrahenta = contractor NIP (tax ID)
  - Waluta = currency
  - StatusPlatnosci = payment status
  - KodPocztowy = postal code
  - Miejscowosc = city
  - Ulica = street

## Invoice types
- prz_faktura_kraj = domestic invoice (faktura krajowa)
- prz_faktura_wysylka = shipment invoice
- prz_faktura_paragon = receipt invoice (faktura do paragonu)
- prz_dostawa_ue_towarow = intra-EU delivery (WDT)
- prz_eksport_towarow = export invoice
- prz_eksport_dost_uslug_ue = EU service invoice (art. 28b)
- prz_faktura_wys_ter_kraj = foreign currency invoice

## VAT rates
Polish standard: 23%, reduced: 8%, 5%, 0%, exempt (zw).
Use -1 for exempt (zw) when creating invoices.

## Payment methods
- przelew = bank transfer
- gotowka = cash
- karta = card
- kompensata = offset/netting
- barter = barter

## Payment statuses (for filtering)
- przeterminowane = overdue
- nieoplacone = unpaid
- oplaconeCzesciowo = partially paid
- oplacone = paid

## Expense body format
Expense tools (create_cost_expense, create_goods_purchase_expense, create_telecom_expense) use flat VAT fields per rate bracket:
- KwotaNetto23, KwotaVat23 (23% rate)
- KwotaNetto08, KwotaVat08 (8% rate)
- KwotaNetto05, KwotaVat05 (5% rate)
- KwotaNetto00 (0% rate)
- KwotaNettoZw (exempt)
They do NOT use line items (Pozycje). Sales invoices use Pozycje, expenses use flat amounts.

## Important notes
- list_invoices requires dateFrom (dataOd). Always provide a start date.
- Contractor search returns max 20 results.
- Invoice numbers use slashes (e.g. "A2/2/2026"). When used in payment URLs, slashes become underscores.
- update_contractor requires ALL fields — omitted fields get deleted. Always fetch first with get_contractor.
- Correction invoices use the original invoice ID in the URL path, not in the body.
- EU VAT rates are queried per country code (ISO 3166-1 alpha-2). Greece uses EL.
- KSeF = Krajowy System e-Faktur (Poland's national e-invoicing system).
- Full API docs: https://api.ifirma.pl/
`;

export function createServer(config: Config) {
	const client = new IfirmaClient(config);

	const server = new McpServer({
		name: "ifirma-mcp-server",
		version: "0.1.0",
		instructions: SERVER_INSTRUCTIONS,
	});

	if (config.keys.faktura) {
		registerInvoiceTools(server, client);
		registerPaymentTools(server, client);
		registerKsefTools(server, client);
		registerContractorTools(server, client);
		registerVatRateTools(server, client);
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
