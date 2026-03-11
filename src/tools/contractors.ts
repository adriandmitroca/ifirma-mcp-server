import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

export function registerContractorTools(
	server: McpServer,
	client: IfirmaClient,
) {
	server.tool(
		"search_contractors",
		"Search contractors by name or NIP number. Returns matching contractors with their IDs, names, NIP numbers, and addresses.",
		{
			query: z
				.string()
				.min(1)
				.describe("Search query — contractor name or NIP"),
		},
		async (input) => {
			try {
				const result = await client.request({
					method: "GET",
					path: `kontrahenci/${encodeURIComponent(input.query)}.json`,
					keyName: "faktura",
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
		"get_contractor",
		"Get full contractor details by ID. Returns complete contractor information including address, NIP, email, and phone.",
		{
			id: z.number().positive().describe("Contractor ID"),
		},
		async (input) => {
			try {
				const result = await client.request({
					method: "GET",
					path: `kontrahenci/id/${input.id}.json`,
					keyName: "faktura",
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
		"create_contractor",
		"Create a new contractor in iFirma. Returns the created contractor data.",
		{
			name: z.string().describe("Company name"),
			nip: z.string().optional().describe("NIP number"),
			street: z.string().optional().describe("Street address"),
			postalCode: z.string().describe("Postal code"),
			city: z.string().describe("City"),
			country: z.string().default("Polska").describe("Country"),
			email: z.string().optional().describe("Email address"),
			phone: z.string().optional().describe("Phone number"),
		},
		async (input) => {
			try {
				const result = await client.request({
					method: "POST",
					path: "kontrahenci.json",
					keyName: "faktura",
					body: {
						Nazwa: input.name,
						NIP: input.nip || "",
						Ulica: input.street || "",
						KodPocztowy: input.postalCode,
						Miejscowosc: input.city,
						Kraj: input.country,
						Email: input.email || "",
						Telefon: input.phone || "",
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
		"update_contractor",
		"Update an existing contractor in iFirma. Only provided fields will be updated.",
		{
			id: z.number().positive().describe("Contractor ID"),
			name: z.string().optional().describe("Company name"),
			nip: z.string().optional().describe("NIP number"),
			street: z.string().optional().describe("Street address"),
			postalCode: z.string().optional().describe("Postal code"),
			city: z.string().optional().describe("City"),
			country: z.string().optional().describe("Country"),
			email: z.string().optional().describe("Email address"),
			phone: z.string().optional().describe("Phone number"),
		},
		async (input) => {
			try {
				const body: Record<string, unknown> = {};
				if (input.name !== undefined) body.Nazwa = input.name;
				if (input.nip !== undefined) body.NIP = input.nip;
				if (input.street !== undefined) body.Ulica = input.street;
				if (input.postalCode !== undefined) body.KodPocztowy = input.postalCode;
				if (input.city !== undefined) body.Miejscowosc = input.city;
				if (input.country !== undefined) body.Kraj = input.country;
				if (input.email !== undefined) body.Email = input.email;
				if (input.phone !== undefined) body.Telefon = input.phone;

				const result = await client.request({
					method: "PUT",
					path: `kontrahenci/${input.id}.json`,
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
}
