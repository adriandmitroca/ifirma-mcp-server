import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

const vatInvoiceSchema = {
	invoiceNumber: z.string().describe("Vendor invoice number"),
	issueDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.describe("Issue date (YYYY-MM-DD)"),
	documentDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.describe("Date on the document (YYYY-MM-DD)"),
	contractorNip: z.string().describe("Vendor NIP number"),
	contractor: z
		.object({
			name: z.string().describe("Contractor name"),
			nip: z.string().optional().describe("Contractor NIP"),
			street: z.string().optional().describe("Street address"),
			postalCode: z.string().describe("Postal code"),
			city: z.string().describe("City"),
			country: z.string().default("Polska").describe("Country name"),
		})
		.optional()
		.describe(
			"Full contractor details (used when contractorNip alone is not enough)",
		),
	items: z
		.array(
			z.object({
				name: z.string().describe("Item name"),
				quantity: z.number().describe("Quantity"),
				unitNetPrice: z.number().describe("Unit net price in PLN"),
				vatRate: z
					.number()
					.describe("VAT rate: 23, 8, 5, 0 or -1 for exempt (zw)"),
				unit: z.string().default("szt.").describe("Unit of measure"),
			}),
		)
		.min(1)
		.describe("Invoice line items"),
	paymentMethod: z
		.enum(["przelew", "gotowka", "karta", "kompensata"])
		.default("przelew")
		.describe("Payment method"),
	notes: z.string().optional().describe("Additional notes"),
};

function buildVatInvoiceBody(input: {
	invoiceNumber: string;
	issueDate: string;
	documentDate: string;
	contractorNip: string;
	contractor?: {
		name: string;
		nip?: string;
		street?: string;
		postalCode: string;
		city: string;
		country: string;
	};
	items: Array<{
		name: string;
		quantity: number;
		unitNetPrice: number;
		vatRate: number;
		unit: string;
	}>;
	paymentMethod: string;
	notes?: string;
}) {
	return {
		Zapilesz: true,
		NumerDokumentu: input.invoiceNumber,
		DataWystawienia: input.issueDate,
		DataDokumentu: input.documentDate,
		SposobZaplaty: input.paymentMethod,
		Uwagi: input.notes || "",
		Pozycje: input.items.map((item) => ({
			StawkaVat: item.vatRate === -1 ? "zw" : item.vatRate / 100,
			Ilosc: item.quantity,
			CenaJednostkowa: item.unitNetPrice,
			NazwaPelna: item.name,
			Jednostka: item.unit,
			TypStawkiVat: item.vatRate === -1 ? "ZW" : "PRC",
		})),
		Kontrahent: input.contractorNip
			? { Identyfikator: null, NIP: input.contractorNip }
			: {
					Identyfikator: null,
					NIP: input.contractor?.nip || "",
					Nazwa: input.contractor?.name || "",
					Ulica: input.contractor?.street || "",
					KodPocztowy: input.contractor?.postalCode || "",
					Kraj: input.contractor?.country || "Polska",
					Miejscowosc: input.contractor?.city || "",
				},
	};
}

export function registerExpenseTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"create_cost_expense",
		"Book a VAT invoice as a business cost (koszt działalności). Creates an expense entry in the cost ledger.",
		vatInvoiceSchema,
		async (input) => {
			try {
				const result = await client.request({
					method: "POST",
					path: "kosztdzialalnoscivat.json",
					keyName: "wydatek",
					body: buildVatInvoiceBody(input),
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
		"create_goods_purchase_expense",
		"Book a VAT invoice for goods or materials purchase (zakup towaru). Creates an expense entry in the goods purchase ledger.",
		vatInvoiceSchema,
		async (input) => {
			try {
				const result = await client.request({
					method: "POST",
					path: "zakuptowaruvat.json",
					keyName: "wydatek",
					body: buildVatInvoiceBody(input),
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
		"create_other_cost_expense",
		"Book a non-invoice document as a business cost (paragon, umowa, nota, inne). For receipts, contracts, internal notes, and other non-VAT documents.",
		{
			documentType: z
				.enum(["paragon", "umowa", "nota", "inne"])
				.describe("Type of document"),
			documentNumber: z.string().describe("Document number"),
			issueDate: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.describe("Issue date (YYYY-MM-DD)"),
			description: z.string().describe("What the expense is for"),
			netAmount: z.number().describe("Net amount in PLN"),
			paymentMethod: z
				.enum(["przelew", "gotowka", "karta"])
				.default("gotowka")
				.describe("Payment method"),
		},
		async (input) => {
			try {
				const result = await client.request({
					method: "POST",
					path: "kosztdzialalnosci.json",
					keyName: "wydatek",
					body: {
						Zapilesz: true,
						RodzajDokumentu: input.documentType,
						NumerDokumentu: input.documentNumber,
						DataWystawienia: input.issueDate,
						Opis: input.description,
						KwotaNetto: input.netAmount,
						SposobZaplaty: input.paymentMethod,
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
		"create_telecom_expense",
		"Book a phone or internet expense (opłata telefon/internet). For telecom invoices with partial business deductibility.",
		{
			invoiceNumber: z.string().describe("Vendor invoice number"),
			issueDate: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.describe("Issue date (YYYY-MM-DD)"),
			contractorNip: z.string().describe("Telecom provider NIP"),
			totalGross: z.number().describe("Total gross amount in PLN"),
			deductiblePercent: z
				.number()
				.min(0)
				.max(100)
				.default(100)
				.describe("Percentage deductible as business cost"),
			vatRate: z.number().default(23).describe("VAT rate (e.g. 23)"),
			paymentMethod: z
				.enum(["przelew", "gotowka", "karta"])
				.default("przelew")
				.describe("Payment method"),
		},
		async (input) => {
			try {
				const result = await client.request({
					method: "POST",
					path: "oplatatelefon.json",
					keyName: "wydatek",
					body: {
						Zapilesz: true,
						NumerDokumentu: input.invoiceNumber,
						DataWystawienia: input.issueDate,
						KwotaBrutto: input.totalGross,
						ProcentKosztow: input.deductiblePercent,
						StawkaVat: input.vatRate / 100,
						SposobZaplaty: input.paymentMethod,
						Kontrahent: {
							Identyfikator: null,
							NIP: input.contractorNip,
						},
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
