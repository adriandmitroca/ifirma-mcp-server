import { IfirmaApiError } from "../client/api.js";

export function formatToolError(error: unknown): string {
	if (error instanceof IfirmaApiError) {
		return `iFirma API error (${error.status}) on ${error.path}: ${error.body}`;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

type ToolResult = {
	content: { type: "text"; text: string }[];
	isError?: boolean;
};

export function wrapToolHandler(
	fn: () => Promise<unknown>,
): Promise<ToolResult> {
	return fn().then(
		(result) => ({
			content: [
				{ type: "text" as const, text: JSON.stringify(result, null, 2) },
			],
		}),
		(error) => ({
			content: [{ type: "text" as const, text: formatToolError(error) }],
			isError: true,
		}),
	);
}
