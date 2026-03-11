# ifirma-mcp-server

[![npm version](https://img.shields.io/npm/v/ifirma-mcp-server.svg)](https://www.npmjs.com/package/ifirma-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for the [iFirma.pl](https://www.ifirma.pl) Polish accounting API. Enables AI assistants (Claude, Cursor, Windsurf) to manage invoices, expenses, contractors, and more through natural language.

## Setup

### Claude Code

```bash
claude mcp add ifirma \
  -e IFIRMA_USERNAME=your@email.pl \
  -e IFIRMA_API_KEY_INVOICE=hex_key_faktura \
  -e IFIRMA_API_KEY_EXPENSE=hex_key_wydatek \
  -e IFIRMA_API_KEY_ACCOUNT=hex_key_abonent \
  -e IFIRMA_API_KEY_RECEIPT=hex_key_rachunek \
  -- npx -y ifirma-mcp-server
```

### Other MCP clients

Run via `npx -y ifirma-mcp-server` with the environment variables below.

### API Keys

1. Log in to [ifirma.pl](https://www.ifirma.pl)
2. Go to **Settings > API**
3. Generate keys for: Faktura, Wydatek, Abonent
4. Copy the hex keys into environment variables

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `IFIRMA_USERNAME` | Yes | iFirma login (email) |
| `IFIRMA_API_KEY_INVOICE` | No* | API key for invoices (`faktura`) |
| `IFIRMA_API_KEY_EXPENSE` | No* | API key for expenses (`wydatek`) |
| `IFIRMA_API_KEY_ACCOUNT` | No* | API key for account operations (`abonent`) |
| `IFIRMA_API_KEY_RECEIPT` | No* | API key for receipts (`rachunek`) |
| `IFIRMA_DRY_RUN` | No | Test mode — logs requests without sending |

\* At least one API key is required.

## Available Tools

### Invoices (`faktura` key)

| Tool | Description |
|---|---|
| `list_invoices` | List issued invoices with filters |
| `create_domestic_invoice` | Domestic VAT invoice |
| `create_domestic_invoice_non_vat` | Domestic invoice for non-VAT payers |
| `create_proforma` | Proforma invoice |
| `create_export_invoice` | Export invoice |
| `create_wdt_invoice` | Intra-community supply (WDT) invoice |
| `create_eu_service_invoice` | EU service invoice (art. 28b) |
| `create_foreign_currency_invoice` | Foreign currency invoice |
| `create_correction_invoice` | Correction invoice |
| `create_receipt_invoice` | Receipt invoice (faktura do paragonu) |
| `create_oss_invoice` | One Stop Shop invoice |
| `create_ioss_invoice` | Import One Stop Shop invoice |
| `send_invoice_email` | Send invoice by email |
| `send_invoice_post` | Send invoice via postal mail |
| `send_invoice_ksef` | Submit invoice to KSeF |

### Contractors (`faktura` key)

| Tool | Description |
|---|---|
| `search_contractors` | Search by name or NIP |
| `get_contractor` | Contractor details by ID |
| `create_contractor` | Add new contractor |
| `update_contractor` | Update contractor (requires all fields) |

### Payments (`faktura` key)

| Tool | Description |
|---|---|
| `register_payment` | Register payment against an invoice |

### VAT Rates (`faktura` key)

| Tool | Description |
|---|---|
| `get_eu_vat_rates` | EU VAT rates by country code |

### Expenses (`wydatek` key)

| Tool | Description |
|---|---|
| `create_cost_expense` | Business cost with VAT invoice |
| `create_goods_purchase_expense` | Goods/materials purchase |
| `create_other_cost_expense` | Non-invoice cost (receipt, contract, etc.) |
| `create_telecom_expense` | Phone/internet expense |

### Account (`abonent` key)

| Tool | Description |
|---|---|
| `get_accounting_month` | Current accounting month |
| `set_accounting_month` | Change accounting month |
| `get_api_limits` | Check API rate limits |

### Orders (`abonent` key)

| Tool | Description |
|---|---|
| `create_order` | Create e-commerce order |

### HR (`abonent` key)

| Tool | Description |
|---|---|
| `manage_employee_questionnaire` | Employee personal questionnaire |

## Development

```bash
git clone https://github.com/adriandmitroca/ifirma-mcp-server.git
cd ifirma-mcp-server
npm install
npm run dev
```

```bash
npm test                           # Unit tests (no API access needed)
IFIRMA_DRY_RUN=true npm run dev    # Dry-run mode
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

MIT
