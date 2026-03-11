import { createHmac } from "node:crypto";

export type KeyName = "faktura" | "wydatek" | "abonent" | "rachunek";

export interface AuthConfig {
	username: string;
	keys: Partial<Record<KeyName, string>>;
}

export function computeAuthHeader(
	config: AuthConfig,
	keyName: KeyName,
	url: string,
	body: string,
): string {
	const key = config.keys[keyName];
	if (!key) {
		throw new Error(`Missing API key for scope: ${keyName}`);
	}

	const baseUrl = url.split("?")[0];
	const message = baseUrl + config.username + keyName + body;
	const keyBuffer = Buffer.from(key, "hex");
	const hmac = createHmac("sha1", keyBuffer).update(message).digest("hex");

	return `IAPIS user=${config.username}, hmac-sha1=${hmac}`;
}
