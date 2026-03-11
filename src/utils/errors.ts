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
