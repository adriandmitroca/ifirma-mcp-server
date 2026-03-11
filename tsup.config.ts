import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	target: "node18",
	outDir: "dist",
	clean: true,
	dts: true,
	banner: {
		js: "#!/usr/bin/env node",
	},
	noExternal: [/.*/],
	external: ["@modelcontextprotocol/sdk"],
});
