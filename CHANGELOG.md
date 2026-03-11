# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Initial project scaffold
- HMAC-SHA1 authentication layer for iFirma API
- HTTP client with dry-run mode
- Read-only tools: `list_invoices`, `get_invoice`, `search_contractors`, `get_contractor`
- All invoice types: domestic (VAT/non-VAT), proforma, export, WDT, EU service, foreign currency, correction, receipt, OSS, IOSS
- Invoice delivery: `send_invoice_email`, `send_invoice_post`, `send_invoice_ksef`
- Expense tools: `create_cost_expense`, `create_goods_purchase_expense`, `create_other_cost_expense`, `create_telecom_expense`
- Contractor CRUD: `create_contractor`, `update_contractor`
- Payment registration: `register_payment`
- Order creation: `create_order`
- HR: `manage_employee_questionnaire`
- Account tools: `get_accounting_month`, `set_accounting_month`, `get_api_limits`, `get_eu_vat_rates`
- Unit tests for auth signing, config parsing, and API client
- CI pipeline (GitHub Actions)
- Bilingual README (Polish + English)
