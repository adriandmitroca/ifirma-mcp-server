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
- Endpoint URLs match the spec: `/zakuptowaruvat.json`, `/kosztdzialalnoscivat.json`, etc.
- But body format uses flat VAT amount fields (KwotaNetto23, KwotaVat23) not line items
- **TODO:** Verify our line-item-based body format actually works

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
