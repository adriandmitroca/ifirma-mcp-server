# Findings

## iFirma API — Actual vs Documented Endpoints

The original implementation spec assumed endpoint paths that turned out to be wrong. Here's what we learned from testing and reading the real API docs at https://api.ifirma.pl/

### Invoice Listing
- **NOT** per-type paths like `/fakturakraj/list.json`
- **Correct:** `GET /faktury.json?dataOd=...&typ=...` (single endpoint, type is a filter)
- **Proformas:** `GET /proformy.json?dataOd=...` (separate endpoint)
- `dataOd` (start date) is **required**
- Pagination: `strona` (page, default 1) + `iloscNaStronie` (per page, default 20)
- No `limit`/`offset` style pagination

### Single Invoice
- **No endpoint exists** for getting a single invoice by ID
- The list endpoint returns sufficient detail (contractor, amounts, dates, status)

### Contractors
- Search: `GET /kontrahenci/{query}.json` (query in path, not query param)
- Get by ID: `GET /kontrahenci/id/{id}.json` (note the `/id/` segment)
- Auth key: `faktura` (NOT `abonent` as originally assumed)

### Payments
- `POST /faktury/wplaty/{typ}/{numer}.json`
- Invoice number slashes → underscores (e.g. `A2/2/2026` → `A2_2_2026`)

### Email/Post Sending
- `POST /fakturakraj/send/{id}.json` for email
- Same URL with `?wyslijPoczta=true` for traditional mail
- Body uses `SkrzynkaEmailOdbiorcy` (not `AdresEmail`)

### KSeF
- `POST /fakturakraj/ksef/send/{id}.json`
- Body: `{ "DataWysylki": null }`

### Expenses
- Endpoint URLs match the spec: `/zakuptowaruvat.json`, `/kosztdzialalnoscivat.json`, `/kosztdzialalnosci.json`, `/oplatatelefon.json`
- Body format uses flat VAT amount fields: `KwotaNetto23`, `KwotaVat23`, `KwotaNetto08`, etc. — NOT line items (Pozycje)
- `RodzajSprzedazy`: OP (taxable), ZW (exempt), OPIZW (mixed)
- `OznaczenieKSeF`: NUMER, OFF, BFK, DI
- Other cost doc types: RACH, PAR, DOW_DOST, UM, DOW_OPL, NOTA_KS, POKW_ODB, BIL
- Contractor can be matched by: `IdentyfikatorKontrahenta` → `NIPKontrahenta` → inline `Kontrahent` object

### Correction Invoice
- **NOT** `POST /fakturakrajkorekta.json` with ID in body
- **Correct:** `POST /fakturakraj/korekta/{identyfikator_faktury}.json` — ID in URL
- Field: `PowodKorekty` (not `PrzyczynaKorekty`), values: OBOW_RABAT, ZWR_SPRZ_TOW, ZWR_NAB_KWOT, ZWR_NAB_ZAL, PODW_CENY, POMYLKI

### Receipt Invoice
- **NOT** `fakturaparadoparagonu.json`
- **Correct:** `fakturaparagon.json`

### Foreign Currency Invoice
- **NOT** `fakturakrajwaluta.json`
- **Correct:** `fakturawaluta.json`
- Exchange rate field: `KursWalutyZDniaPoprzedzajacegoDzienWystawieniaFaktury` (not `KursWaluty`)

### API Limits
- **NOT** `limit.json`
- **Correct:** `abonent/limit.json`

### EU VAT Rates
- **NOT** `GET /stawki-vat-ue.json` (all countries, key=abonent)
- **Correct:** `GET /slownik/stawki_vat/{kod_kraju}.json` (per country, key=faktura)
- Country codes: ISO 3166-1 alpha-2 (Greece = EL, not GR)

### Payment Registration
- Body fields: `{ Kwota, Data, KwotaPln?, Kurs? }` — NOT `DataWplaty`/`Opis`

### Invoice Email/Post Sending
- Different URL per invoice type (not just `fakturakraj`):
  - fakturakraj, fakturawysylka, fakturaproformakraj, fakturaeksporttowarow, fakturawdt, fakturaeksportuslugue, fakturawaluta

### Contractor Update
- API requires **ALL** contractor data — fields not sent will be DELETED
- Always fetch first with get_contractor, then send complete data

### Orders
- **NOT** `POST /zamowienia.json` (abonent key)
- **Correct:** `POST /hub/user/platform/CUSTOM/V1/orders/order` (e-commerce hub API)

### Employee Questionnaire
- Required fields: Email, Plec (M/K), Obywatelstwo
- Date format: DD-MM-RRRR (not YYYY-MM-DD)
- Address sections: AdresZameldowania, AdresZamieszkania, AdresKorespondencyjny

## API Response Format

Responses wrap data in `{ "response": { ... } }`. List responses use:
```json
{
  "response": {
    "Kod": 0,
    "Informacja": "",
    "Wynik": [ ... ]
  }
}
```
