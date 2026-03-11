import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";
import { formatToolError } from "../utils/errors.js";

export function registerOrderTools(server: McpServer, client: IfirmaClient) {
	server.tool(
		"create_order",
		"Create a new order in iFirma's e-commerce module. Uses the hub API endpoint. Requires order ID, status, currency, and at least one item.",
		{
			orderId: z.string().describe("Unique order identifier (max 40 chars)"),
			status: z.string().describe("Order status (max 100 chars)"),
			created: z
				.string()
				.describe("Creation timestamp (yyyy-MM-ddTHH:mm:ss.SSS)"),
			currency: z.string().describe("ISO 4217 currency code (e.g. PLN, EUR)"),
			shippingTotal: z.number().describe("Shipping cost"),
			productsTotalNet: z
				.number()
				.describe("Products total net (before shipping)"),
			paymentMethod: z.string().optional().describe("Payment method name"),
			items: z
				.array(
					z.object({
						name: z.string().describe("Product name"),
						quantity: z.number().describe("Quantity"),
						price: z.number().describe("Unit price"),
						tax: z.number().optional().describe("Tax amount"),
						taxPercent: z.number().optional().describe("Tax percentage"),
						sku: z.string().optional().describe("SKU code"),
					}),
				)
				.min(1)
				.describe("Order line items"),
			billing: z
				.object({
					firstName: z.string().optional(),
					lastName: z.string().optional(),
					company: z.string().optional(),
					nip: z.string().optional(),
					address1: z.string().optional(),
					city: z.string().optional(),
					postcode: z.string().optional(),
					country: z.string().optional(),
					email: z.string().optional(),
					phone: z.string().optional(),
				})
				.optional()
				.describe("Billing address"),
			shipping: z
				.object({
					firstName: z.string().optional(),
					lastName: z.string().optional(),
					company: z.string().optional(),
					address1: z.string().optional(),
					city: z.string().optional(),
					postcode: z.string().optional(),
					country: z.string().optional(),
				})
				.optional()
				.describe("Shipping address"),
		},
		async (input) => {
			try {
				const body: Record<string, unknown> = {
					id: input.orderId,
					status: input.status,
					created: input.created,
					currency: input.currency,
					shippingTotal: input.shippingTotal,
					productsTotalNet: input.productsTotalNet,
					items: input.items,
				};
				if (input.paymentMethod) body.paymentMethod = input.paymentMethod;
				if (input.billing) body.billing = input.billing;
				if (input.shipping) body.shipping = input.shipping;

				const result = await client.request({
					method: "POST",
					path: "hub/user/platform/CUSTOM/V1/orders/order",
					keyName: "abonent",
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
