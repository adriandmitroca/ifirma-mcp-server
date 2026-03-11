import { describe, expect, it } from "vitest";
import { buildVatExpenseBody } from "../src/tools/expenses.js";

describe("buildVatExpenseBody", () => {
	const baseInput = {
		invoiceNumber: "FV/123/2026",
		issueDate: "2026-03-01",
		expenseName: "Office supplies",
		netto23: 100,
		netto08: 0,
		netto05: 0,
		netto00: 0,
		nettoZw: 0,
		salesType: "OP",
		ksefMarking: "OFF",
	};

	it("produces correct flat VAT fields", () => {
		const body = buildVatExpenseBody(baseInput);
		expect(body.NumerFaktury).toBe("FV/123/2026");
		expect(body.DataWystawienia).toBe("2026-03-01");
		expect(body.NazwaWydatku).toBe("Office supplies");
		expect(body.KwotaNetto23).toBe(100);
		expect(body.KwotaNetto08).toBe(0);
		expect(body.KwotaNetto05).toBe(0);
		expect(body.KwotaNetto00).toBe(0);
		expect(body.KwotaNettoZw).toBe(0);
		expect(body.RodzajSprzedazy).toBe("OP");
		expect(body.OznaczenieKSeF).toBe("OFF");
	});

	it("does NOT use Pozycje (line items)", () => {
		const body = buildVatExpenseBody(baseInput);
		expect(body.Pozycje).toBeUndefined();
	});

	it("includes VAT amounts when provided", () => {
		const body = buildVatExpenseBody({
			...baseInput,
			vat23: 23,
			vat08: 4,
			vat05: 2.5,
		});
		expect(body.KwotaVat23).toBe(23);
		expect(body.KwotaVat08).toBe(4);
		expect(body.KwotaVat05).toBe(2.5);
	});

	it("omits VAT amounts when not provided", () => {
		const body = buildVatExpenseBody(baseInput);
		expect(body.KwotaVat23).toBeUndefined();
		expect(body.KwotaVat08).toBeUndefined();
		expect(body.KwotaVat05).toBeUndefined();
	});

	it("includes receipt date and payment deadline when provided", () => {
		const body = buildVatExpenseBody({
			...baseInput,
			receiptDate: "2026-03-02",
			paymentDeadline: "2026-03-15",
		});
		expect(body.DataWplywu).toBe("2026-03-02");
		expect(body.TerminPlatnosci).toBe("2026-03-15");
	});

	it("omits receipt date and payment deadline when not provided", () => {
		const body = buildVatExpenseBody(baseInput);
		expect(body.DataWplywu).toBeUndefined();
		expect(body.TerminPlatnosci).toBeUndefined();
	});

	it("uses contractor identifier when provided", () => {
		const body = buildVatExpenseBody({
			...baseInput,
			contractorIdentifier: "ACME-CORP",
		});
		expect(body.IdentyfikatorKontrahenta).toBe("ACME-CORP");
		expect(body.NIPKontrahenta).toBeUndefined();
		expect(body.Kontrahent).toBeUndefined();
	});

	it("uses NIP when identifier not provided", () => {
		const body = buildVatExpenseBody({
			...baseInput,
			contractorNip: "1234567890",
		});
		expect(body.NIPKontrahenta).toBe("1234567890");
		expect(body.IdentyfikatorKontrahenta).toBeUndefined();
		expect(body.Kontrahent).toBeUndefined();
	});

	it("uses inline contractor when neither identifier nor NIP provided", () => {
		const body = buildVatExpenseBody({
			...baseInput,
			contractor: {
				name: "Jan Kowalski",
				isNaturalPerson: true,
				postalCode: "00-001",
				city: "Warszawa",
			},
		});
		const kontrahent = body.Kontrahent as Record<string, unknown>;
		expect(kontrahent.Nazwa).toBe("Jan Kowalski");
		expect(kontrahent.OsobaFizyczna).toBe(true);
		expect(kontrahent.KodPocztowy).toBe("00-001");
		expect(kontrahent.Miejscowosc).toBe("Warszawa");
	});

	it("prioritizes identifier over NIP over contractor", () => {
		const body = buildVatExpenseBody({
			...baseInput,
			contractorIdentifier: "ACME",
			contractorNip: "1234567890",
			contractor: {
				name: "Test",
				isNaturalPerson: false,
				postalCode: "00-001",
				city: "Wroclaw",
			},
		});
		expect(body.IdentyfikatorKontrahenta).toBe("ACME");
		expect(body.NIPKontrahenta).toBeUndefined();
		expect(body.Kontrahent).toBeUndefined();
	});

	it("handles multiple VAT rate brackets", () => {
		const body = buildVatExpenseBody({
			...baseInput,
			netto23: 100,
			vat23: 23,
			netto08: 50,
			vat08: 4,
			netto05: 25,
			netto00: 10,
			nettoZw: 5,
			salesType: "OPIZW",
		});
		expect(body.KwotaNetto23).toBe(100);
		expect(body.KwotaVat23).toBe(23);
		expect(body.KwotaNetto08).toBe(50);
		expect(body.KwotaVat08).toBe(4);
		expect(body.KwotaNetto05).toBe(25);
		expect(body.KwotaNetto00).toBe(10);
		expect(body.KwotaNettoZw).toBe(5);
		expect(body.RodzajSprzedazy).toBe("OPIZW");
	});
});
