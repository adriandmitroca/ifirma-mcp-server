export function formatPLN(amount: number): string {
	return new Intl.NumberFormat("pl-PL", {
		style: "currency",
		currency: "PLN",
	}).format(amount);
}

export function formatDate(date: string): string {
	return date;
}

export function today(): string {
	return new Date().toISOString().split("T")[0];
}
