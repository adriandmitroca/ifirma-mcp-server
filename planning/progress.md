# Progress Log

## 2026-03-11

### Session 1 — Full implementation
- Scaffolded project (TypeScript, tsup, vitest, biome)
- Implemented core: auth (HMAC-SHA1), API client, config
- Implemented all 30 tools across 7 categories
- Fixed API endpoints based on real iFirma API docs
- Added server instructions for AI context
- Created 13 commits, pushed to github.com/adriandmitroca/ifirma-mcp-server
- Tested list_invoices with real API — works
- Set up planning structure

### Tools implemented (29 total)
- Invoices: list, create (11 types), send email/post/ksef, correction
- Expenses: cost, goods purchase, other cost, telecom
- Contractors: search, get, create, update
- Payments: register
- Orders: create
- Account: get/set month, limits, EU VAT rates
- HR: employee questionnaire
