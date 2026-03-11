import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

export function registerHrTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"manage_employee_questionnaire",
		"Submit or update an employee personal questionnaire (kwestionariusz osobowy). Used for onboarding employees with their personal and tax data.",
		{
			firstName: z.string().describe("Employee first name"),
			lastName: z.string().describe("Employee last name"),
			pesel: z.string().optional().describe("PESEL number"),
			dateOfBirth: z.string().optional().describe("Date of birth (YYYY-MM-DD)"),
			nip: z.string().optional().describe("Employee NIP number"),
			street: z.string().optional().describe("Street address"),
			postalCode: z.string().optional().describe("Postal code"),
			city: z.string().optional().describe("City"),
			taxOffice: z.string().optional().describe("Tax office name"),
			bankAccount: z
				.string()
				.optional()
				.describe("Bank account number for salary"),
		},
		async (input) => {
			try {
				const body: Record<string, unknown> = {
					Imie: input.firstName,
					Nazwisko: input.lastName,
				};
				if (input.pesel) body.PESEL = input.pesel;
				if (input.dateOfBirth) body.DataUrodzenia = input.dateOfBirth;
				if (input.nip) body.NIP = input.nip;
				if (input.street) body.Ulica = input.street;
				if (input.postalCode) body.KodPocztowy = input.postalCode;
				if (input.city) body.Miejscowosc = input.city;
				if (input.taxOffice) body.UrzadSkarbowy = input.taxOffice;
				if (input.bankAccount) body.NumerKonta = input.bankAccount;

				const result = await client.request({
					method: "POST",
					path: "kwestionariusz.json",
					keyName: "abonent",
					body,
				});

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(result, null, 2),
						},
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
