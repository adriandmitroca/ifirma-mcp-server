export interface InvoiceListItem {
	Identyfikator: number;
	NumerPelny: string;
	DataWystawienia: string;
	DataSprzedazy: string;
	NazwaKontrahenta: string;
	NIPKontrahenta: string;
	BruttoSuma: number;
	NettoSuma: number;
	StatusPlatnosci: string;
	TypFaktury: string;
}

export interface ContractorListItem {
	Identyfikator: number;
	Nazwa: string;
	NIP: string;
	Ulica: string;
	KodPocztowy: string;
	Miejscowosc: string;
}

export interface AccountingMonth {
	MiesiacKsiegowy: string;
	RokKsiegowy: number;
}

export interface ApiLimits {
	LimitDzienny: number;
	LimitMinutowy: number;
	WykorzystaneDzienny: number;
	WykorzystaneMinutowy: number;
}

export interface VatRate {
	Kraj: string;
	StawkaPodstawowa: number;
	StawkaObnizona1: number;
	StawkaObnizona2: number;
}

export interface ApiResponse<T> {
	response: T;
}
