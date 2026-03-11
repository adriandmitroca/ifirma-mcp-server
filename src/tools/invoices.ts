import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

export const LIST_TYPE_MAP: Record<string, string> = {
	krajowa: "prz_faktura_kraj",
	eksport: "prz_eksport_towarow",
	wdt: "prz_dostawa_ue_towarow",
	eu_service: "prz_eksport_dost_uslug_ue",
	paragon: "prz_faktura_paragon",
	waluta: "prz_faktura_wys_ter_kraj",
};

export function buildInvoiceBodyFn(input: {
	issueDate: string;
	saleDate?: string;
	paymentDeadline: string;
	paymentMethod: string;
	contractorNip?: string;
	contractor?: {
		name: string;
		nip?: string;
		street?: string;
		postalCode: string;
		city: string;
		country: string;
		email?: string;
	};
	items: {
		name: string;
		unit: string;
		quantity: number;
		unitNetPrice: number;
		vatRate: number;
		pkwiu?: string;
		gtu?: string;
	}[];
	notes?: string;
	splitPayment: boolean;
	noSignature: boolean;
	accountNumber?: string;
}) {
	const body: Record<string, unknown> = {
		Zapilesz: true,
		LiczOd: "netto",
		DataWystawienia: input.issueDate,
		MiejsceWystawienia: "",
		DataSprzedazy: input.saleDate || input.issueDate,
		FormatDatySprzedazy: "DZN",
		TerminPlatnosci: input.paymentDeadline,
		SposobZaplaty: input.paymentMethod,
		NumerKontaBankowego: input.accountNumber || "",
		RodzajPodpisuOdbiorcy: input.noSignature ? "BPO" : "OUP",
		PodpisFaktury: "",
		UwagiNaFakturze: input.notes || "",
		WidocznoscNumeruGios: false,
		Numer: null,
		Pozycje: input.items.map((item) => ({
			StawkaVat: item.vatRate === -1 ? "zw" : item.vatRate / 100,
			Ilosc: item.quantity,
			CenaJednostkowa: item.unitNetPrice,
			NazwaPelna: item.name,
			Jednostka: item.unit,
			TypStawkiVat: item.vatRate === -1 ? "ZW" : "PRC",
			PKWiU: item.pkwiu || "",
			GTU: item.gtu || "",
		})),
		Kontrahent: input.contractorNip
			? {
					Identyfikator: null,
					NIP: input.contractorNip,
					PrefiksUE: "",
				}
			: {
					Identyfikator: null,
					NIP: input.contractor?.nip || "",
					Nazwa: input.contractor?.name || "",
					Ulica: input.contractor?.street || "",
					KodPocztowy: input.contractor?.postalCode || "",
					Kraj: input.contractor?.country || "Polska",
					Miejscowosc: input.contractor?.city || "",
					Email: input.contractor?.email || "",
					PrefiksUE: "",
				},
	};

	if (input.splitPayment) {
		body.MechanizmPodzielonejPlatnosci = true;
	}

	return body;
}

export function registerInvoiceTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"list_invoices",
		"List issued invoices with optional filters. Returns invoice numbers, dates, contractor names, amounts, and payment status.",
		{
			dateFrom: z.string().describe("Start date (YYYY-MM-DD) — required"),
			dateTo: z
				.string()
				.optional()
				.describe("End date (YYYY-MM-DD) — defaults to 30 days from dateFrom"),
			type: z
				.enum([
					"all",
					"krajowa",
					"proforma",
					"eksport",
					"wdt",
					"eu_service",
					"paragon",
					"waluta",
				])
				.default("all")
				.describe("Invoice type filter"),
			status: z
				.enum([
					"all",
					"przeterminowane",
					"nieoplacone",
					"oplaconeCzesciowo",
					"oplacone",
				])
				.default("all")
				.optional()
				.describe("Payment status filter"),
			page: z.number().min(1).default(1).describe("Page number"),
			perPage: z
				.number()
				.min(1)
				.max(100)
				.default(20)
				.describe("Results per page"),
			contractorNip: z.string().optional().describe("Filter by contractor NIP"),
		},
		async (input) => {
			try {
				const params: Record<string, string> = {
					dataOd: input.dateFrom,
					strona: String(input.page),
					iloscNaStronie: String(input.perPage),
				};
				if (input.dateTo) params.dataDo = input.dateTo;
				if (input.type !== "all" && input.type !== "proforma") {
					params.typ = LIST_TYPE_MAP[input.type] || "";
				}
				if (input.status && input.status !== "all") {
					params.status = input.status;
				}
				if (input.contractorNip) {
					params.nipKontrahenta = input.contractorNip;
				}

				const path =
					input.type === "proforma" ? "proformy.json" : "faktury.json";
				const result = await client.request({
					method: "GET",
					path,
					keyName: "faktura",
					params,
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

	const invoiceItemSchema = z.object({
		name: z.string().describe("Item name"),
		unit: z.string().default("szt.").describe("Unit of measure"),
		quantity: z.number().describe("Quantity"),
		unitNetPrice: z.number().describe("Net price per unit"),
		vatRate: z
			.number()
			.describe("VAT rate: 23, 8, 5, 0, or -1 for exempt (zw)"),
		pkwiu: z.string().optional().describe("PKWiU code"),
		gtu: z.string().optional().describe("GTU code"),
	});

	const contractorSchema = z.object({
		name: z.string().describe("Contractor name"),
		nip: z.string().optional().describe("NIP number"),
		street: z.string().optional().describe("Street address"),
		postalCode: z.string().describe("Postal code"),
		city: z.string().describe("City"),
		country: z.string().default("Polska").describe("Country"),
		email: z.string().optional().describe("Email address"),
	});

	const domesticInvoiceSchema = {
		issueDate: z.string().describe("Issue date in YYYY-MM-DD format"),
		saleDate: z
			.string()
			.optional()
			.describe("Sale date in YYYY-MM-DD format, defaults to issueDate"),
		paymentDeadline: z
			.string()
			.describe("Payment deadline in YYYY-MM-DD format"),
		paymentMethod: z
			.enum(["przelew", "gotowka", "karta", "kompensata", "barter"])
			.default("przelew")
			.describe("Payment method"),
		contractorNip: z
			.string()
			.optional()
			.describe(
				"Contractor NIP — if provided, contractor is matched from iFirma DB",
			),
		contractor: contractorSchema
			.optional()
			.describe("Contractor details — used when contractorNip is not provided"),
		items: z.array(invoiceItemSchema).min(1).describe("Invoice line items"),
		notes: z.string().optional().describe("Notes on the invoice"),
		splitPayment: z
			.boolean()
			.default(false)
			.describe("Enable split payment mechanism"),
		noSignature: z
			.boolean()
			.default(false)
			.describe("If true, invoice has no recipient signature field"),
		accountNumber: z.string().optional().describe("Bank account number"),
	};

	const buildInvoiceBody = buildInvoiceBodyFn;

	server.tool(
		"create_domestic_invoice",
		"Create a new domestic invoice (faktura krajowa). Requires issue date, payment deadline, at least one line item, and contractor info (either NIP for existing or full details for new).",
		domesticInvoiceSchema,
		async (input) => {
			try {
				const body = buildInvoiceBody(input);
				const result = await client.request({
					method: "POST",
					path: "fakturakraj.json",
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

	server.tool(
		"create_proforma",
		"Create a new proforma invoice. Same structure as domestic invoice but posted as proforma. Requires issue date, payment deadline, at least one line item, and contractor info.",
		domesticInvoiceSchema,
		async (input) => {
			try {
				const body = buildInvoiceBody(input);
				const result = await client.request({
					method: "POST",
					path: "fakturaproforma.json",
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

	const SEND_TYPE_MAP: Record<string, string> = {
		krajowa: "fakturakraj",
		wysylka: "fakturawysylka",
		proforma: "fakturaproformakraj",
		eksport: "fakturaeksporttowarow",
		wdt: "fakturawdt",
		eu_service: "fakturaeksportuslugue",
		waluta: "fakturawaluta",
	};

	server.tool(
		"send_invoice_email",
		"Send an issued invoice by email to the specified address.",
		{
			id: z.number().positive().describe("Invoice ID"),
			invoiceType: z
				.enum([
					"krajowa",
					"wysylka",
					"proforma",
					"eksport",
					"wdt",
					"eu_service",
					"waluta",
				])
				.default("krajowa")
				.describe("Invoice type (determines the send endpoint)"),
			email: z.string().describe("Recipient email address"),
			message: z
				.string()
				.optional()
				.describe("Custom message text (max 1000 chars)"),
		},
		async (input) => {
			try {
				const body: Record<string, unknown> = {
					SkrzynkaEmailOdbiorcy: input.email,
				};
				if (input.message) body.Tekst = input.message;
				const prefix = SEND_TYPE_MAP[input.invoiceType] || "fakturakraj";
				const result = await client.request({
					method: "POST",
					path: `${prefix}/send/${input.id}.json`,
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

	server.tool(
		"create_correction_invoice",
		"Create a correction invoice (korekta) for an existing domestic invoice. Requires the original invoice ID or number, correction reason, and corrected line items.",
		{
			invoiceId: z
				.string()
				.describe("Invoice ID or number (with / replaced by _) to correct"),
			issueDate: z.string().describe("Issue date in YYYY-MM-DD format"),
			paymentDeadline: z
				.string()
				.optional()
				.describe("Payment deadline in YYYY-MM-DD format"),
			correctionReason: z
				.enum([
					"OBOW_RABAT",
					"ZWR_SPRZ_TOW",
					"ZWR_NAB_KWOT",
					"ZWR_NAB_ZAL",
					"PODW_CENY",
					"POMYLKI",
				])
				.describe(
					"Correction reason code: OBOW_RABAT (discount), ZWR_SPRZ_TOW (goods return), ZWR_NAB_KWOT (amount return), ZWR_NAB_ZAL (advance return), PODW_CENY (price increase), POMYLKI (errors)",
				),
			paymentMethod: z
				.enum(["przelew", "gotowka", "karta", "kompensata", "barter"])
				.default("przelew")
				.describe("Payment method"),
			items: z.array(invoiceItemSchema).min(1).describe("Corrected line items"),
		},
		async (input) => {
			try {
				const body: Record<string, unknown> = {
					DataWystawienia: input.issueDate,
					PowodKorekty: input.correctionReason,
					SposobZaplaty: input.paymentMethod,
					Pozycje: input.items.map((item) => ({
						StawkaVat: item.vatRate === -1 ? "zw" : item.vatRate / 100,
						Ilosc: item.quantity,
						CenaJednostkowa: item.unitNetPrice,
						NazwaPelna: item.name,
						Jednostka: item.unit,
						TypStawkiVat: item.vatRate === -1 ? "ZW" : "PRC",
						PKWiU: item.pkwiu || "",
						GTU: item.gtu || "",
					})),
				};
				if (input.paymentDeadline) {
					body.TerminPlatnosci = input.paymentDeadline;
				}

				const result = await client.request({
					method: "POST",
					path: `fakturakraj/korekta/${encodeURIComponent(input.invoiceId)}.json`,
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

	server.tool(
		"create_domestic_invoice_non_vat",
		"Create a domestic invoice for non-VAT payers (nievatowiec/faktura bez VAT). Same structure as domestic invoice but for businesses not registered as VAT payers.",
		domesticInvoiceSchema,
		async (input) => {
			try {
				const body = buildInvoiceBody(input);
				const result = await client.request({
					method: "POST",
					path: "fakturakraj2.json",
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

	server.tool(
		"create_export_invoice",
		"Create an export invoice (faktura eksportowa) for goods sold outside the EU.",
		domesticInvoiceSchema,
		async (input) => {
			try {
				const body = buildInvoiceBody(input);
				const result = await client.request({
					method: "POST",
					path: "fakturaeksport.json",
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

	server.tool(
		"create_wdt_invoice",
		"Create an intra-community supply invoice (faktura WDT — Wewnątrzwspólnotowa Dostawa Towarów) for goods sold within the EU.",
		{
			...domesticInvoiceSchema,
			euPrefix: z
				.string()
				.describe("EU country prefix for contractor (e.g. DE, FR, CZ)"),
		},
		async (input) => {
			try {
				const body = buildInvoiceBody(input) as Record<string, unknown>;
				(body.Kontrahent as Record<string, unknown>).PrefiksUE = input.euPrefix;
				const result = await client.request({
					method: "POST",
					path: "fakturawdt.json",
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

	server.tool(
		"create_eu_service_invoice",
		"Create an EU service invoice (art. 28b — świadczenie usług na rzecz podatnika z UE).",
		{
			...domesticInvoiceSchema,
			euPrefix: z
				.string()
				.describe("EU country prefix for contractor (e.g. DE, FR, CZ)"),
		},
		async (input) => {
			try {
				const body = buildInvoiceBody(input) as Record<string, unknown>;
				(body.Kontrahent as Record<string, unknown>).PrefiksUE = input.euPrefix;
				const result = await client.request({
					method: "POST",
					path: "fakturaunijnasluga.json",
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

	server.tool(
		"create_foreign_currency_invoice",
		"Create a domestic invoice with foreign currency pricing (faktura walutowa). Uses NBP exchange rate unless custom rate is provided.",
		{
			...domesticInvoiceSchema,
			currency: z
				.string()
				.describe("ISO 4217 currency code (e.g. EUR, USD, GBP)"),
			exchangeRate: z
				.number()
				.optional()
				.describe("Custom exchange rate. If omitted, NBP rate is used."),
		},
		async (input) => {
			try {
				const body = buildInvoiceBody(input) as Record<string, unknown>;
				body.Waluta = input.currency;
				if (input.exchangeRate) {
					body.KursWalutyZDniaPoprzedzajacegoDzienWystawieniaFaktury =
						input.exchangeRate;
				}
				const result = await client.request({
					method: "POST",
					path: "fakturawaluta.json",
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

	server.tool(
		"create_receipt_invoice",
		"Create an invoice for a receipt (faktura do paragonu). Links the invoice to an existing receipt number.",
		{
			...domesticInvoiceSchema,
			receiptNumber: z.string().describe("Receipt (paragon) number"),
		},
		async (input) => {
			try {
				const body = buildInvoiceBody(input) as Record<string, unknown>;
				body.NumerParagonu = input.receiptNumber;
				const result = await client.request({
					method: "POST",
					path: "fakturaparagon.json",
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

	server.tool(
		"create_oss_invoice",
		"Create an OSS invoice (One Stop Shop) for distance selling of goods to EU consumers.",
		{
			...domesticInvoiceSchema,
			deliveryCountry: z
				.string()
				.describe("Country of delivery (e.g. Niemcy, Francja)"),
		},
		async (input) => {
			try {
				const body = buildInvoiceBody(input) as Record<string, unknown>;
				body.KrajDostawy = input.deliveryCountry;
				const result = await client.request({
					method: "POST",
					path: "fakturaoss.json",
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

	server.tool(
		"create_ioss_invoice",
		"Create an IOSS invoice (Import One Stop Shop) for distance selling of imported goods to EU consumers.",
		{
			...domesticInvoiceSchema,
			deliveryCountry: z
				.string()
				.describe("Country of delivery (e.g. Niemcy, Francja)"),
		},
		async (input) => {
			try {
				const body = buildInvoiceBody(input) as Record<string, unknown>;
				body.KrajDostawy = input.deliveryCountry;
				const result = await client.request({
					method: "POST",
					path: "fakturaioss.json",
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

	server.tool(
		"send_invoice_post",
		"Send an invoice via traditional mail (Poczta Polska) through iFirma's mailing service.",
		{
			id: z.number().positive().describe("Invoice ID"),
			invoiceType: z
				.enum([
					"krajowa",
					"wysylka",
					"proforma",
					"eksport",
					"wdt",
					"eu_service",
					"waluta",
				])
				.default("krajowa")
				.describe("Invoice type (determines the send endpoint)"),
		},
		async (input) => {
			try {
				const prefix = SEND_TYPE_MAP[input.invoiceType] || "fakturakraj";
				const result = await client.request({
					method: "POST",
					path: `${prefix}/send/${input.id}.json`,
					keyName: "faktura",
					params: { wyslijPoczta: "true" },
					body: {},
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
