# ifirma-mcp-server

[![npm version](https://img.shields.io/npm/v/ifirma-mcp-server.svg)](https://www.npmjs.com/package/ifirma-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Serwer MCP dla API iFirma.pl — pozwala asystentom AI (Claude, Cursor, Windsurf) zarządzać fakturami, wydatkami i kontrahentami w iFirma.

MCP server for the iFirma.pl Polish accounting API — enables AI assistants to manage invoices, expenses, and contractors through natural language.

---

## Instalacja / Installation

### Claude Desktop

Dodaj do `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ifirma": {
      "command": "npx",
      "args": ["-y", "ifirma-mcp-server"],
      "env": {
        "IFIRMA_USERNAME": "twoj@email.pl",
        "IFIRMA_API_KEY_INVOICE": "klucz_hex_faktura",
        "IFIRMA_API_KEY_EXPENSE": "klucz_hex_wydatek",
        "IFIRMA_API_KEY_ACCOUNT": "klucz_hex_abonent"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add ifirma -- npx -y ifirma-mcp-server
```

### Instalacja globalna / Global install

```bash
npm install -g ifirma-mcp-server
```

## Konfiguracja / Configuration

### Zmienne środowiskowe / Environment Variables

| Variable | Required | Description |
|---|---|---|
| `IFIRMA_USERNAME` | Yes | Login do iFirma (email) |
| `IFIRMA_API_KEY_INVOICE` | No* | Klucz API dla faktur (`faktura`) |
| `IFIRMA_API_KEY_EXPENSE` | No* | Klucz API dla wydatków (`wydatek`) |
| `IFIRMA_API_KEY_ACCOUNT` | No* | Klucz API dla konta (`abonent`) |
| `IFIRMA_API_KEY_RECEIPT` | No* | Klucz API dla rachunków (`rachunek`) |
| `IFIRMA_DRY_RUN` | No | Tryb testowy — loguje requesty bez wysyłania |

\* Wymagany co najmniej jeden klucz API / At least one API key is required.

### Jak uzyskać klucze API / How to get API keys

1. Zaloguj się na [ifirma.pl](https://www.ifirma.pl)
2. Przejdź do **Ustawienia → API**
3. Wygeneruj klucze dla: Faktura, Wydatek, Abonent
4. Skopiuj klucze hex do zmiennych środowiskowych

## Dostępne narzędzia / Available Tools

### Faktury / Invoices (`faktura` key)

| Tool | Opis / Description |
|---|---|
| `list_invoices` | Lista faktur / List issued invoices |
| `get_invoice` | Szczegóły faktury / Invoice details by ID |
| `create_domestic_invoice` | Faktura krajowa (VAT) / Domestic invoice for VAT payers |
| `create_domestic_invoice_non_vat` | Faktura krajowa (nie-VAT) / Domestic invoice for non-VAT payers |
| `create_proforma` | Faktura proforma / Proforma invoice |
| `create_export_invoice` | Faktura eksportowa / Export invoice |
| `create_wdt_invoice` | Faktura WDT / Intra-community supply invoice |
| `create_eu_service_invoice` | Faktura usługa UE (art. 28b) / EU service invoice |
| `create_foreign_currency_invoice` | Faktura walutowa / Foreign currency invoice |
| `create_correction_invoice` | Faktura korygująca / Correction invoice |
| `create_receipt_invoice` | Faktura do paragonu / Receipt invoice |
| `create_oss_invoice` | Faktura OSS / One Stop Shop invoice |
| `create_ioss_invoice` | Faktura IOSS / Import One Stop Shop invoice |
| `send_invoice_email` | Wyślij fakturę emailem / Send invoice by email |
| `send_invoice_post` | Wyślij fakturę pocztą / Send invoice via mail |
| `send_invoice_ksef` | Wyślij do KSeF / Submit to KSeF |

### Płatności / Payments (`faktura` key)

| Tool | Opis / Description |
|---|---|
| `register_payment` | Zarejestruj wpłatę / Register payment against invoice |

### Wydatki / Expenses (`wydatek` key)

| Tool | Opis / Description |
|---|---|
| `create_cost_expense` | Koszt działalności (VAT) / Business cost with VAT invoice |
| `create_goods_purchase_expense` | Zakup towarów / Goods/materials purchase |
| `create_other_cost_expense` | Koszt bez faktury / Non-invoice cost (receipt, contract) |
| `create_telecom_expense` | Opłata telefoniczna / Phone/internet expense |

### Kontrahenci / Contractors (`abonent` key)

| Tool | Opis / Description |
|---|---|
| `search_contractors` | Szukaj kontrahentów / Search by name or NIP |
| `get_contractor` | Szczegóły kontrahenta / Contractor details by ID |
| `create_contractor` | Dodaj kontrahenta / Add new contractor |
| `update_contractor` | Aktualizuj kontrahenta / Update contractor details |

### Zamówienia / Orders (`abonent` key)

| Tool | Opis / Description |
|---|---|
| `create_order` | Utwórz zamówienie / Create a new order |

### Konto / Account (`abonent` key)

| Tool | Opis / Description |
|---|---|
| `get_accounting_month` | Aktualny miesiąc księgowy / Current accounting month |
| `set_accounting_month` | Zmień miesiąc księgowy / Change accounting month |
| `get_api_limits` | Limity API / Check API rate limits |
| `get_eu_vat_rates` | Stawki VAT UE / EU VAT rates |

### HR (`abonent` key)

| Tool | Opis / Description |
|---|---|
| `manage_employee_questionnaire` | Kwestionariusz pracownika / Employee questionnaire |

## Przykłady / Examples

**Wystawianie faktury / Creating an invoice:**
> "Wystaw fakturę dla Acme sp. z o.o., NIP 1234567890, za 10h konsultacji frontend po 200 PLN/h netto, VAT 23%, termin 14 dni"

**Lista faktur / Listing invoices:**
> "Pokaż faktury z tego miesiąca" / "Show me this month's invoices"

**Księgowanie wydatku / Booking an expense:**
> "Zaksięguj fakturę Hetzner, 49 EUR, FV/2026/03/001 jako koszt działalności"

**Szukanie kontrahenta / Searching contractors:**
> "Znajdź kontrahenta Acme" / "Find contractor Acme"

**Sprawdzanie limitów / Checking limits:**
> "Ile requestów API mi zostało?" / "How many API requests do I have left?"

## Rozwój / Development

```bash
git clone https://github.com/adrianmaj/ifirma-mcp-server.git
cd ifirma-mcp-server
npm install
npm run dev
```

### Testing

```bash
npm test                           # Unit tests (no API access needed)
IFIRMA_INTEGRATION=true npm test   # Integration tests (requires credentials)
```

### Dry-run mode

```bash
IFIRMA_DRY_RUN=true npm run dev
```

## Licencja / License

MIT
