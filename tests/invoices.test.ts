import { describe, expect, it } from "vitest";
import { LIST_TYPE_MAP, buildInvoiceBodyFn } from "../src/tools/invoices.js";

describe("LIST_TYPE_MAP", () => {
	it("maps krajowa to prz_faktura_kraj", () => {
		expect(LIST_TYPE_MAP.krajowa).toBe("prz_faktura_kraj");
	});

	it("maps all expected invoice types", () => {
		expect(LIST_TYPE_MAP.eksport).toBe("prz_eksport_towarow");
		expect(LIST_TYPE_MAP.wdt).toBe("prz_dostawa_ue_towarow");
		expect(LIST_TYPE_MAP.eu_service).toBe("prz_eksport_dost_uslug_ue");
		expect(LIST_TYPE_MAP.paragon).toBe("prz_faktura_paragon");
		expect(LIST_TYPE_MAP.waluta).toBe("prz_faktura_wys_ter_kraj");
	});
});

describe("buildInvoiceBodyFn", () => {
	const baseInput = {
		issueDate: "2026-03-01",
		paymentDeadline: "2026-03-15",
		paymentMethod: "przelew",
		items: [
			{
				name: "Consulting",
				unit: "h",
				quantity: 10,
				unitNetPrice: 200,
				vatRate: 23,
			},
		],
		splitPayment: false,
		noSignature: false,
		contractorNip: "1234567890",
	};

	it("produces correct top-level fields", () => {
		const body = buildInvoiceBodyFn(baseInput);
		expect(body.Zapilesz).toBe(true);
		expect(body.LiczOd).toBe("netto");
		expect(body.DataWystawienia).toBe("2026-03-01");
		expect(body.TerminPlatnosci).toBe("2026-03-15");
		expect(body.SposobZaplaty).toBe("przelew");
		expect(body.FormatDatySprzedazy).toBe("DZN");
		expect(body.Numer).toBeNull();
	});

	it("defaults DataSprzedazy to issueDate when saleDate not provided", () => {
		const body = buildInvoiceBodyFn(baseInput);
		expect(body.DataSprzedazy).toBe("2026-03-01");
	});

	it("uses saleDate when provided", () => {
		const body = buildInvoiceBodyFn({ ...baseInput, saleDate: "2026-02-28" });
		expect(body.DataSprzedazy).toBe("2026-02-28");
	});

	it("maps VAT rate from percentage to decimal", () => {
		const body = buildInvoiceBodyFn(baseInput);
		const pozycje = body.Pozycje as Array<Record<string, unknown>>;
		expect(pozycje[0].StawkaVat).toBe(0.23);
		expect(pozycje[0].TypStawkiVat).toBe("PRC");
	});

	it("maps VAT rate -1 to exempt (zw)", () => {
		const body = buildInvoiceBodyFn({
			...baseInput,
			items: [{ ...baseInput.items[0], vatRate: -1 }],
		});
		const pozycje = body.Pozycje as Array<Record<string, unknown>>;
		expect(pozycje[0].StawkaVat).toBe("zw");
		expect(pozycje[0].TypStawkiVat).toBe("ZW");
	});

	it("maps item fields to Polish names", () => {
		const body = buildInvoiceBodyFn(baseInput);
		const pozycje = body.Pozycje as Array<Record<string, unknown>>;
		expect(pozycje[0].NazwaPelna).toBe("Consulting");
		expect(pozycje[0].Jednostka).toBe("h");
		expect(pozycje[0].Ilosc).toBe(10);
		expect(pozycje[0].CenaJednostkowa).toBe(200);
	});

	it("uses NIP-only contractor when contractorNip provided", () => {
		const body = buildInvoiceBodyFn(baseInput);
		const kontrahent = body.Kontrahent as Record<string, unknown>;
		expect(kontrahent.NIP).toBe("1234567890");
		expect(kontrahent.Identyfikator).toBeNull();
		expect(kontrahent.PrefiksUE).toBe("");
		expect(kontrahent.Nazwa).toBeUndefined();
	});

	it("uses inline contractor when contractorNip not provided", () => {
		const body = buildInvoiceBodyFn({
			...baseInput,
			contractorNip: undefined,
			contractor: {
				name: "Acme Corp",
				nip: "9876543210",
				postalCode: "00-001",
				city: "Warszawa",
				country: "Polska",
			},
		});
		const kontrahent = body.Kontrahent as Record<string, unknown>;
		expect(kontrahent.Nazwa).toBe("Acme Corp");
		expect(kontrahent.NIP).toBe("9876543210");
		expect(kontrahent.KodPocztowy).toBe("00-001");
		expect(kontrahent.Miejscowosc).toBe("Warszawa");
	});

	it("sets BPO when noSignature is true", () => {
		const body = buildInvoiceBodyFn({ ...baseInput, noSignature: true });
		expect(body.RodzajPodpisuOdbiorcy).toBe("BPO");
	});

	it("sets OUP when noSignature is false", () => {
		const body = buildInvoiceBodyFn(baseInput);
		expect(body.RodzajPodpisuOdbiorcy).toBe("OUP");
	});

	it("adds split payment flag when enabled", () => {
		const body = buildInvoiceBodyFn({ ...baseInput, splitPayment: true });
		expect(body.MechanizmPodzielonejPlatnosci).toBe(true);
	});

	it("omits split payment flag when disabled", () => {
		const body = buildInvoiceBodyFn(baseInput);
		expect(body.MechanizmPodzielonejPlatnosci).toBeUndefined();
	});

	it("includes PKWiU and GTU when provided", () => {
		const body = buildInvoiceBodyFn({
			...baseInput,
			items: [{ ...baseInput.items[0], pkwiu: "62.01", gtu: "12" }],
		});
		const pozycje = body.Pozycje as Array<Record<string, unknown>>;
		expect(pozycje[0].PKWiU).toBe("62.01");
		expect(pozycje[0].GTU).toBe("12");
	});
});
