import { type AuthConfig, type KeyName, computeAuthHeader } from "./auth.js";

const BASE_URL = "https://www.ifirma.pl/iapi";

interface ApiRequestOptions {
	method: "GET" | "POST" | "PUT";
	path: string;
	keyName: KeyName;
	body?: Record<string, unknown>;
	params?: Record<string, string>;
}

export class IfirmaClient {
	private dryRun: boolean;

	constructor(private config: AuthConfig) {
		this.dryRun = process.env.IFIRMA_DRY_RUN === "true";
	}

	async request<T>(options: ApiRequestOptions): Promise<T> {
		const url = new URL(`${BASE_URL}/${options.path}`);
		if (options.params) {
			for (const [key, value] of Object.entries(options.params)) {
				url.searchParams.set(key, value);
			}
		}

		const body = options.body ? JSON.stringify(options.body) : "";
		const auth = computeAuthHeader(
			this.config,
			options.keyName,
			url.toString(),
			body,
		);

		const headers: Record<string, string> = {
			Authentication: auth,
			"Content-Type": "application/json; charset=utf-8",
			Accept: "application/json",
		};

		if (this.dryRun) {
			return {
				_dryRun: true,
				method: options.method,
				url: url.toString(),
				headers,
				body: body || undefined,
			} as T;
		}

		const response = await fetch(url.toString(), {
			method: options.method,
			headers,
			body: options.method !== "GET" ? body : undefined,
		});

		if (!response.ok) {
			const errorBody = await response.text();
			throw new IfirmaApiError(response.status, errorBody, options.path);
		}

		return response.json() as Promise<T>;
	}
}

export class IfirmaApiError extends Error {
	constructor(
		public status: number,
		public body: string,
		public path: string,
	) {
		super(`iFirma API error ${status} on ${path}: ${body}`);
		this.name = "IfirmaApiError";
	}
}
