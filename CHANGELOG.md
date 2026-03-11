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
