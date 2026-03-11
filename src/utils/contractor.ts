export function resolveContractor(input: {
	contractorIdentifier?: string;
	contractorNip?: string;
	contractor?: {
		name: string;
		isNaturalPerson?: boolean;
		postalCode: string;
		city: string;
	};
}): Record<string, unknown> {
	if (input.contractorIdentifier) {
		return { IdentyfikatorKontrahenta: input.contractorIdentifier };
	}
	if (input.contractorNip) {
		return { NIPKontrahenta: input.contractorNip };
	}
	if (input.contractor) {
		return {
			Kontrahent: {
				Nazwa: input.contractor.name,
				OsobaFizyczna: input.contractor.isNaturalPerson ?? false,
				KodPocztowy: input.contractor.postalCode,
				Miejscowosc: input.contractor.city,
			},
		};
	}
	return {};
}
