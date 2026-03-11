# 1.0.0 (2026-03-11)


### Bug Fixes

* align all API endpoints and body formats with iFirma docs ([0aea0b0](https://github.com/adriandmitroca/ifirma-mcp-server/commit/0aea0b0cf5dd6b37222c803d18dcecb14d714db7))


### Features

* account tools — accounting month, API limits, EU VAT rates ([4b0a161](https://github.com/adriandmitroca/ifirma-mcp-server/commit/4b0a161a711284cc55f7e9a192a06acfec514640))
* add server instructions for AI context ([799a75f](https://github.com/adriandmitroca/ifirma-mcp-server/commit/799a75feaba1f961deecd3aeee214fe08461d7f3))
* contractor tools — search, get, create, update ([e013400](https://github.com/adriandmitroca/ifirma-mcp-server/commit/e013400667859f4cb993a6a467913ec15af3e89f))
* create_order tool ([7c0342c](https://github.com/adriandmitroca/ifirma-mcp-server/commit/7c0342c87dde4d357d3e6baabc871152b36a0d42))
* expense tools — cost, goods purchase, telecom, other ([563ee06](https://github.com/adriandmitroca/ifirma-mcp-server/commit/563ee0682cb3e2f1d796b8d497c445ba9ae554ff))
* HMAC-SHA1 auth, API client, config with tests ([79a13ea](https://github.com/adriandmitroca/ifirma-mcp-server/commit/79a13ea5fd21bc467a909144901e858b137f7b79))
* invoice tools — list, create, send, correct ([b0b46d5](https://github.com/adriandmitroca/ifirma-mcp-server/commit/b0b46d5da2f7f5134546df2663bcce66903359ba))
* manage_employee_questionnaire tool ([bbb9648](https://github.com/adriandmitroca/ifirma-mcp-server/commit/bbb9648d7ff524a2c7be75230287f8c909254d2c))
* MCP server entry point with conditional tool registration ([68c27eb](https://github.com/adriandmitroca/ifirma-mcp-server/commit/68c27eb3a52923173076ab6e90ba6176e095e544))
* register_payment tool ([582730f](https://github.com/adriandmitroca/ifirma-mcp-server/commit/582730f02ce378515beca0f77badb903d927e2bd))
* send_invoice_ksef tool ([3407fbe](https://github.com/adriandmitroca/ifirma-mcp-server/commit/3407fbe14373f70af162389bfb1a0f94e9ee454d))
* set up semantic-release for automated npm publishing ([bdf0006](https://github.com/adriandmitroca/ifirma-mcp-server/commit/bdf0006d24e2b2abbf52bbc4f539ccbdabab05c5))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- HMAC-SHA1 authentication layer for iFirma API
- HTTP client with dry-run mode
- Invoice listing: `list_invoices` with date/status filters
- All invoice types: domestic (VAT/non-VAT), proforma, export, WDT, EU service, foreign currency, correction, receipt, OSS, IOSS
- Invoice delivery: `send_invoice_email`, `send_invoice_post`, `send_invoice_ksef`
- Expense tools: `create_cost_expense`, `create_goods_purchase_expense`, `create_other_cost_expense`, `create_telecom_expense`
- Contractor CRUD: `search_contractors`, `get_contractor`, `create_contractor`, `update_contractor`
- Payment registration: `register_payment`
- EU VAT rates: `get_eu_vat_rates` (per-country lookup)
- Order creation: `create_order` (e-commerce hub API)
- HR: `manage_employee_questionnaire`
- Account tools: `get_accounting_month`, `set_accounting_month`, `get_api_limits`
- Unit tests for auth signing, config parsing, API client, invoice body builder, and expense body builder
- CI pipeline (GitHub Actions)
