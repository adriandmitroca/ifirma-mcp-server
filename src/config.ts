import { z } from "zod";

const configSchema = z.object({
	username: z.string().min(1, "IFIRMA_USERNAME is required"),
	keys: z
		.object({
			faktura: z.string().optional(),
			wydatek: z.string().optional(),
			abonent: z.string().optional(),
			rachunek: z.string().optional(),
		})
		.refine(
			(keys) => Object.values(keys).some(Boolean),
			"At least one API key must be provided",
		),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
	return configSchema.parse({
		username: process.env.IFIRMA_USERNAME,
		keys: {
			faktura: process.env.IFIRMA_API_KEY_INVOICE,
			wydatek: process.env.IFIRMA_API_KEY_EXPENSE,
			abonent: process.env.IFIRMA_API_KEY_ACCOUNT,
			rachunek: process.env.IFIRMA_API_KEY_RECEIPT,
		},
	});
}
