import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		exclude: process.env.IFIRMA_INTEGRATION ? [] : ["tests/integration/**"],
	},
});
