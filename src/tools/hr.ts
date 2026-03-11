import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { wrapToolHandler } from "../utils/errors.js";

export function registerHrTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"manage_employee_questionnaire",
		"Submit or update an employee personal questionnaire (kwestionariusz osobowy). Used for onboarding employees with their personal and tax data.",
		{
			email: z.string().describe("Employee email address (required)"),
			firstName: z.string().describe("Employee first name"),
			lastName: z.string().describe("Employee last name"),
			gender: z.enum(["M", "K"]).describe("Gender: M (male) or K (female)"),
			citizenship: z.string().describe("Citizenship (e.g. Polska)"),
			pesel: z
				.string()
				.optional()
				.describe("PESEL number (required for Polish citizens, 11 digits)"),
			dateOfBirth: z
				.string()
				.optional()
				.describe("Date of birth in DD-MM-YYYY format"),
			middleName: z.string().optional().describe("Middle name"),
			phone: z.string().optional().describe("Phone number"),
			nip: z.string().optional().describe("Employee NIP number"),
			documentType: z
				.enum(["DOWOD_OSOBISTY", "PASZPORT"])
				.optional()
				.describe("Identity document type"),
			documentNumber: z.string().optional().describe("Document number"),
			isPolishResident: z
				.boolean()
				.default(true)
				.describe("Is Polish tax resident"),
			taxOfficeCode: z
				.string()
				.optional()
				.describe("Tax office code (required)"),
			bankAccount: z
				.string()
				.optional()
				.describe("Bank account number (26 digits)"),
			bankName: z.string().optional().describe("Bank name"),
			registrationAddress: z
				.object({
					street: z.string().describe("Street"),
					buildingNumber: z.string().describe("Building number"),
					apartmentNumber: z.string().optional().describe("Apartment number"),
					postalCode: z.string().describe("Postal code"),
					city: z.string().describe("City"),
					postOffice: z.string().describe("Post office"),
					municipality: z.string().describe("Municipality (gmina)"),
					county: z.string().describe("County (powiat)"),
					province: z.string().describe("Province (województwo)"),
				})
				.optional()
				.describe("Registration address (adres zameldowania)"),
		},
		(input) =>
			wrapToolHandler(() => {
				const body: Record<string, unknown> = {
					Email: input.email,
					Imie: input.firstName,
					Nazwisko: input.lastName,
					Plec: input.gender,
					Obywatelstwo: input.citizenship,
					MiejsceRezydencjiPolska: input.isPolishResident,
					OsobaWspolpracujaca: false,
				};
				if (input.pesel) body.PESEL = input.pesel;
				if (input.dateOfBirth) body.DataUrodzenia = input.dateOfBirth;
				if (input.middleName) body.DrugieImie = input.middleName;
				if (input.phone) body.Telefon = input.phone;
				if (input.nip) body.NIP = input.nip;
				if (input.documentType)
					body.RodzajDokumentuTozsamosci = input.documentType;
				if (input.documentNumber)
					body.SeriaNumerDowoduTozsamosci = input.documentNumber;
				if (input.taxOfficeCode) body.UrzadSkarbowyKod = input.taxOfficeCode;
				if (input.bankAccount) body.KontoBankowe = input.bankAccount;
				if (input.bankName) body.NazwaBanku = input.bankName;
				if (input.registrationAddress) {
					body.AdresZameldowania = {
						Ulica: input.registrationAddress.street,
						NumerDomu: input.registrationAddress.buildingNumber,
						NumerLokalu: input.registrationAddress.apartmentNumber || "",
						KodPocztowy: input.registrationAddress.postalCode,
						Miejscowosc: input.registrationAddress.city,
						Poczta: input.registrationAddress.postOffice,
						Gmina: input.registrationAddress.municipality,
						Powiat: input.registrationAddress.county,
						Wojewodztwo: input.registrationAddress.province,
						AdresZagraniczny: false,
					};
				}

				return client.request({
					method: "POST",
					path: "kwestionariusz.json",
					keyName: "abonent",
					body,
				});
			}),
	);
}
