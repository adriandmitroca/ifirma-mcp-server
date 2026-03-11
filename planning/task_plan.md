# ifirma-mcp-server — Task Plan

## Goal
Build and open-source an MCP server for the iFirma.pl accounting API.

## Phases

### Phase 1: Foundation — `complete`
- [x] Project scaffold (tsconfig, tsup, biome, vitest)
- [x] Config and env var loading
- [x] Auth layer (HMAC-SHA1 signing) with unit tests
- [x] HTTP client with error handling and dry-run mode
- [x] CI pipeline (GitHub Actions)

### Phase 2: Read-only Tools — `complete`
- [x] list_invoices (with date range, type, status, pagination)
- [x] search_contractors, get_contractor
- [x] get_accounting_month, set_accounting_month
- [x] get_api_limits, get_eu_vat_rates

### Phase 3: Write Operations — `complete`
- [x] create_domestic_invoice (+ non-VAT, proforma, export, WDT, EU service, foreign currency, receipt, OSS, IOSS)
- [x] create_correction_invoice
- [x] create_cost_expense, create_goods_purchase_expense, create_other_cost_expense, create_telecom_expense
- [x] create_contractor, update_contractor
- [x] register_payment
- [x] create_order
- [x] manage_employee_questionnaire

### Phase 4: Delivery & Polish — `complete`
- [x] send_invoice_email, send_invoice_post, send_invoice_ksef
- [x] Server instructions for AI context (Polish field mappings)
- [x] Bilingual README (PL/EN)
- [x] CONTRIBUTING, CHANGELOG, LICENSE

### Phase 5: API Endpoint Fixes — `complete`
- [x] Fix list_invoices → /faktury.json with correct params (dataOd, strona, iloscNaStronie, typ)
- [x] Remove get_invoice (no such endpoint in iFirma API)
- [x] Fix search_contractors → /kontrahenci/{query}.json
- [x] Fix get_contractor → /kontrahenci/id/{id}.json
- [x] Fix register_payment → /faktury/wplaty/{typ}/{numer}.json
- [x] Fix send_invoice_email → /fakturakraj/send/{id}.json
- [x] Fix send_invoice_post → /fakturakraj/send/{id}.json?wyslijPoczta=true
- [x] Fix send_invoice_ksef → /fakturakraj/ksef/send/{id}.json
- [x] Change contractor tools auth key from abonent → faktura

### Phase 6: Testing with Real API — `in_progress`
- [x] list_invoices (krajowa) — works, returns real data
- [x] list_invoices (wdt, oss, ioss) — works, returns empty arrays
- [ ] search_contractors
- [ ] get_contractor
- [ ] get_accounting_month
- [ ] get_api_limits
- [ ] get_eu_vat_rates
- [ ] Verify expense endpoint body format against API docs
- [ ] Verify invoice creation body format against API docs

### Phase 7: Open Source Release — `not_started`
- [ ] Remove `"private": true` from package.json
- [ ] Re-enable publish workflow (tag trigger)
- [ ] npm publish
- [ ] Submit to MCP server directories
- [ ] Community promotion

## Errors Encountered

| Error | Resolution |
|-------|------------|
| Double shebang in dist/index.js | Removed shebang from src/index.ts, keep only tsup banner |
| vitest picking up node_modules tests | Added `include: ["tests/**/*.test.ts"]` to vitest config |
| biome `noExplicitAny` lint errors | Changed `Record<string, any>` to `Record<string, unknown>` |
| 404 on fakturaproforma/list.json | iFirma uses `/faktury.json` with `typ` param, not per-type paths |
| 404 on fakturaeksport/list.json | Same — fixed to use `/faktury.json?typ=prz_eksport_towarow` |
| Contractor endpoints used wrong auth key | iFirma uses `faktura` key for contractors, not `abonent` |

## Key Files

| File | Purpose |
|------|---------|
| planning/implementation-spec.md | Original spec (reference) |
| planning/release-plan.md | Open source release checklist |
| src/server.ts | Server setup + AI instructions |
| src/client/auth.ts | HMAC-SHA1 signing |
| src/client/api.ts | HTTP client |
| src/tools/*.ts | Tool implementations |
