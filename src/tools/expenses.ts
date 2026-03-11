import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { resolveContractor } from "../utils/contractor.js";
import { wrapToolHandler } from "../utils/errors.js";

const contractorFields = {
	contractorIdentifier: z
		.string()
		.optional()
		.describe("Existing contractor identifier (from search_contractors)"),
	contractorNip: z
		.string()
		.optional()
		.describe("Contractor NIP — used if identifier not provided"),
	contractor: z
		.object({
			name: z.string().describe("Contractor name"),
			isNaturalPerson: z
				.boolean()
				.default(false)
				.describe("Is a natural person"),
			postalCode: z.string().describe("Postal code"),
			city: z.string().describe("City"),
		})
		.optional()
		.describe(
			"New contractor details — used if neither identifier nor NIP matches",
		),
};

const vatExpenseSchema = {
	invoiceNumber: z.string().describe("Vendor invoice number"),
	issueDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.describe("Invoice issue date (YYYY-MM-DD)"),
	receiptDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional()
		.describe("Date the invoice was received (YYYY-MM-DD)"),
	paymentDeadline: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional()
		.describe("Payment deadline (YYYY-MM-DD)"),
	expenseName: z.string().describe("Description of the expense"),
	netto23: z.number().default(0).describe("Net amount at 23% VAT"),
	vat23: z
		.number()
		.optional()
		.describe("VAT amount at 23% (auto-calculated if omitted)"),
	netto08: z.number().default(0).describe("Net amount at 8% VAT"),
	vat08: z.number().optional().describe("VAT amount at 8%"),
	netto05: z.number().default(0).describe("Net amount at 5% VAT"),
	vat05: z.number().optional().describe("VAT amount at 5%"),
	netto00: z.number().default(0).describe("Net amount at 0% VAT"),
	nettoZw: z.number().default(0).describe("Net amount VAT-exempt (zw)"),
	salesType: z
		.enum(["OP", "ZW", "OPIZW"])
		.default("OP")
		.describe("Sales type: OP (taxable), ZW (exempt), OPIZW (mixed)"),
	ksefMarking: z
		.enum(["NUMER", "OFF", "BFK", "DI"])
		.default("OFF")
		.describe("KSeF marking: NUMER, OFF, BFK, DI"),
	...contractorFields,
};

export function buildVatExpenseBody(input: {
	invoiceNumber: string;
	issueDate: string;
	receiptDate?: string;
	paymentDeadline?: string;
	expenseName: string;
	netto23: number;
	vat23?: number;
	netto08: number;
	vat08?: number;
	netto05: number;
	vat05?: number;
	netto00: number;
	nettoZw: number;
	salesType: string;
	ksefMarking: string;
	contractorIdentifier?: string;
	contractorNip?: string;
	contractor?: {
		name: string;
		isNaturalPerson: boolean;
		postalCode: string;
		city: string;
	};
}) {
	const body: Record<string, unknown> = {
		NumerFaktury: input.invoiceNumber,
		DataWystawienia: input.issueDate,
		NazwaWydatku: input.expenseName,
		KwotaNetto23: input.netto23,
		KwotaNetto08: input.netto08,
		KwotaNetto05: input.netto05,
		KwotaNetto00: input.netto00,
		KwotaNettoZw: input.nettoZw,
		RodzajSprzedazy: input.salesType,
		OznaczenieKSeF: input.ksefMarking,
		...resolveContractor(input),
	};

	if (input.vat23 !== undefined) body.KwotaVat23 = input.vat23;
	if (input.vat08 !== undefined) body.KwotaVat08 = input.vat08;
	if (input.vat05 !== undefined) body.KwotaVat05 = input.vat05;
	if (input.receiptDate) body.DataWplywu = input.receiptDate;
	if (input.paymentDeadline) body.TerminPlatnosci = input.paymentDeadline;

	return body;
}

export function registerExpenseTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"create_cost_expense",
		"Book a VAT invoice as a business cost (koszt działalności). Uses flat VAT amount fields per rate bracket (23%, 8%, 5%, 0%, zw).",
		vatExpenseSchema,
		(input) =>
			wrapToolHandler(() =>
				client.request({
					method: "POST",
					path: "kosztdzialalnoscivat.json",
					keyName: "wydatek",
					body: buildVatExpenseBody(input),
				}),
			),
	);

	server.tool(
		"create_goods_purchase_expense",
		"Book a VAT invoice for goods or materials purchase (zakup towaru). Uses flat VAT amount fields per rate bracket (23%, 8%, 5%, 0%, zw).",
		vatExpenseSchema,
		(input) =>
			wrapToolHandler(() =>
				client.request({
					method: "POST",
					path: "zakuptowaruvat.json",
					keyName: "wydatek",
					body: buildVatExpenseBody(input),
				}),
			),
	);

	server.tool(
		"create_other_cost_expense",
		"Book a non-invoice document as a business cost. For receipts, contracts, delivery notes, internal notes, and other non-VAT documents.",
		{
			documentType: z
				.enum([
					"RACH",
					"PAR",
					"DOW_DOST",
					"UM",
					"DOW_OPL",
					"NOTA_KS",
					"POKW_ODB",
					"BIL",
				])
				.describe(
					"Document type: RACH (rachunek), PAR (paragon), DOW_DOST (delivery note), UM (contract), DOW_OPL (payment proof), NOTA_KS (accounting note), POKW_ODB (receipt confirmation), BIL (ticket/bill)",
				),
			documentNumber: z.string().describe("Document number"),
			issueDate: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.describe("Issue date (YYYY-MM-DD)"),
			paymentDeadline: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.optional()
				.describe("Payment deadline (YYYY-MM-DD)"),
			expenseName: z.string().describe("Description of the expense"),
			amount: z.number().describe("Total amount in PLN"),
			...contractorFields,
		},
		(input) =>
			wrapToolHandler(() => {
				const body: Record<string, unknown> = {
					RodzajDokumentu: input.documentType,
					NumerDokumentu: input.documentNumber,
					DataWystawienia: input.issueDate,
					NazwaWydatku: input.expenseName,
					Kwota: input.amount,
					...resolveContractor(input),
				};
				if (input.paymentDeadline) {
					body.TerminPlatnosci = input.paymentDeadline;
				}
				return client.request({
					method: "POST",
					path: "kosztdzialalnosci.json",
					keyName: "wydatek",
					body,
				});
			}),
	);

	server.tool(
		"create_telecom_expense",
		"Book a phone or internet expense (opłata telefon/internet). Uses flat VAT amount fields like other expense types.",
		{
			invoiceNumber: z.string().describe("Vendor invoice number"),
			issueDate: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.describe("Issue date (YYYY-MM-DD)"),
			expenseName: z
				.string()
				.default("Opłata za telefon")
				.describe("Description of the expense"),
			netto23: z.number().default(0).describe("Net amount at 23% VAT"),
			vat23: z.number().optional().describe("VAT amount at 23%"),
			salesType: z
				.enum(["OP", "ZW", "OPIZW"])
				.default("OP")
				.describe("Sales type"),
			...contractorFields,
		},
		(input) =>
			wrapToolHandler(() =>
				client.request({
					method: "POST",
					path: "oplatatelefon.json",
					keyName: "wydatek",
					body: {
						NumerFaktury: input.invoiceNumber,
						DataWystawienia: input.issueDate,
						NazwaWydatku: input.expenseName,
						KwotaNetto23: input.netto23,
						...(input.vat23 !== undefined && { KwotaVat23: input.vat23 }),
						RodzajSprzedazy: input.salesType,
						...resolveContractor(input),
					},
				}),
			),
	);
}
