# ifirma-mcp-server — Implementation Spec

> MCP server for the iFirma.pl accounting API. Enables AI assistants to manage invoices, expenses, contractors, and orders for Polish small businesses (JDG / jednoosobowa działalność gospodarcza).

---

## 1. Project Overview

### What it is

A Model Context Protocol (MCP) server that wraps the [iFirma.pl REST API](https://api.ifirma.pl/), allowing any MCP-compatible client (Claude Desktop, Claude Code, Cursor, Windsurf, etc.) to interact with iFirma bookkeeping through natural language.

### Who it's for

Polish freelancers, sole proprietors (JDG), and small businesses using iFirma.pl for their księgowość — specifically those who want to manage invoicing and expenses from an AI assistant instead of the iFirma web UI.

### Why it matters

iFirma is one of the most popular online accounting platforms in Poland for micro-businesses. Their API is open and well-documented but has no existing MCP integration. This bridges that gap.

---

## 2. Tech Stack

| Component | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict, ESM) | MCP ecosystem standard |
| MCP SDK | `@modelcontextprotocol/sdk` | Official SDK |
| Transport | stdio | Standard for community-distributed MCP servers |
| Schema validation | `zod` | Included with SDK, used for tool input schemas |
| Crypto | Node built-in `crypto` | HMAC-SHA1 signing — no external deps needed |
| HTTP | Native `fetch` | Available in Node 18+, no axios needed |
| Bundler | `tsup` | Single-file dist with shebang for `npx` usage |
| Test framework | `vitest` | Fast, TypeScript-native |
| Linting | `biome` | Single tool for lint + format |
| Node version | >= 18.0.0 | Required for native fetch |

### Key constraints

- **Zero runtime dependencies** beyond the MCP SDK (and its transitive deps). The iFirma API client uses only Node built-ins.
- **No database** — all state lives in iFirma. The server is stateless.
- **No build step for users** — published as pre-bundled JS via npm.

---

## 3. Project Structure

```
ifirma-mcp-server/
├── src/
│   ├── index.ts                  # Entry point: server init, stdio transport
│   ├── server.ts                 # MCP server setup, tool registration
│   ├── config.ts                 # Env var parsing + validation
│   ├── client/
│   │   ├── auth.ts               # HMAC-SHA1 request signing
│   │   ├── api.ts                # HTTP client for iFirma API
│   │   └── types.ts              # iFirma API request/response types
│   ├── tools/
│   │   ├── invoices.ts           # Invoice tools (list, get, create, correct, send)
│   │   ├── expenses.ts           # Expense tools (create various types)
│   │   ├── contractors.ts        # Contractor tools (CRUD, search)
│   │   ├── orders.ts             # Order tools (create)
│   │   ├── ksef.ts               # KSeF tools (send to KSeF)
│   │   ├── payments.ts           # Payment registration tools
│   │   └── account.ts            # Account tools (month, limits, VAT rates)
│   └── utils/
│       ├── errors.ts             # Structured MCP error responses
│       └── formatting.ts         # PLN formatting, date helpers
├── tests/
│   ├── auth.test.ts              # HMAC-SHA1 signing verification
│   ├── api.test.ts               # Request construction tests
│   ├── tools/
│   │   ├── invoices.test.ts
│   │   ├── expenses.test.ts
│   │   └── contractors.test.ts
│   └── fixtures/                 # Sample API responses from docs
│       ├── invoice-response.json
│       ├── contractor-response.json
│       └── expense-response.json
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                # Lint, test, build on PR
│   │   └── publish.yml           # npm publish on release tag
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── tsconfig.json
├── tsup.config.ts
├── biome.json
├── vitest.config.ts
├── package.json
├── LICENSE                       # MIT
├── README.md                     # User-facing docs (English + Polish)
├── CONTRIBUTING.md               # Contributor guide
├── CHANGELOG.md                  # Keep-a-changelog format
└── .changeset/                   # Changesets for versioning
```

---

## 4. Authentication Layer

The iFirma API uses HMAC-SHA1 request signing. This is the most critical piece to get right.

### How it works

Each request requires an `Authentication` header:

```
IAPIS user={username}, hmac-sha1={hash}
```

Where `hash` is computed as:

```
hash = HMAC-SHA1(apiKey, url + username + keyName + requestBody)
```

### Key types

iFirma uses separate API keys for different operations:

| Key name | Scope |
|---|---|
| `faktura` | Issuing and managing invoices |
| `wydatek` | Recording expenses |
| `abonent` | Account settings, contractor management, accounting month |
| `rachunek` | Receipts (rachunek) |

### Implementation

```typescript
// src/client/auth.ts

import { createHmac } from "node:crypto";

export type KeyName = "faktura" | "wydatek" | "abonent" | "rachunek";

export interface AuthConfig {
  username: string;
  keys: Partial<Record<KeyName, string>>; // hex-encoded API keys
}

export function computeAuthHeader(
  config: AuthConfig,
  keyName: KeyName,
  url: string,
  body: string
): string {
  const key = config.keys[keyName];
  if (!key) {
    throw new Error(`Missing API key for scope: ${keyName}`);
  }

  // Important: for URLs with query params, use the base URL (without params) for signing
  const baseUrl = url.split("?")[0];
  const message = baseUrl + config.username + keyName + body;
  const keyBuffer = Buffer.from(key, "hex");
  const hmac = createHmac("sha1", keyBuffer).update(message).digest("hex");

  return `IAPIS user=${config.username}, hmac-sha1=${hmac}`;
}
```

### URL signing caveat

When the request URL contains query parameters (e.g., `?limit=10`), the hash must be computed using the URL **without** the parameters. This is documented in the iFirma API docs and easy to miss.

---

## 5. API Client

```typescript
// src/client/api.ts

import { computeAuthHeader, type AuthConfig, type KeyName } from "./auth.js";

const BASE_URL = "https://www.ifirma.pl/iapi";

interface ApiRequestOptions {
  method: "GET" | "POST" | "PUT";
  path: string;
  keyName: KeyName;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

export class IfirmaClient {
  constructor(private config: AuthConfig) {}

  async request<T>(options: ApiRequestOptions): Promise<T> {
    const url = new URL(`${BASE_URL}/${options.path}`);
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    const body = options.body ? JSON.stringify(options.body) : "";
    const auth = computeAuthHeader(
      this.config,
      options.keyName,
      url.toString(),
      body
    );

    const response = await fetch(url.toString(), {
      method: options.method,
      headers: {
        Authentication: auth,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: options.method !== "GET" ? body : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new IfirmaApiError(response.status, errorBody, options.path);
    }

    return response.json() as Promise<T>;
  }
}

export class IfirmaApiError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string
  ) {
    super(`iFirma API error ${status} on ${path}: ${body}`);
    this.name = "IfirmaApiError";
  }
}
```

---

## 6. Configuration

Users provide credentials via environment variables. No config files — this is the standard for MCP servers distributed via npm.

```typescript
// src/config.ts

import { z } from "zod";

const configSchema = z.object({
  username: z.string().min(1, "IFIRMA_USERNAME is required"),
  keys: z.object({
    faktura: z.string().optional(),
    wydatek: z.string().optional(),
    abonent: z.string().optional(),
    rachunek: z.string().optional(),
  }).refine(
    (keys) => Object.values(keys).some(Boolean),
    "At least one API key must be provided"
  ),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    username: process.env.IFIRMA_USERNAME,
    keys: {
      faktura: process.env.IFIRMA_API_KEY_INVOICE,
      wydatek: process.env.IFIRMA_API_KEY_EXPENSE,
      abonent: process.env.IFIRMA_API_KEY_ACCOUNT,
      rachunek: process.env.IFIRMA_API_KEY_RECEIPT,
    },
  });
}
```

---

## 7. Tool Definitions

### 7.1 Invoices (`faktura` key)

| Tool | Description | iFirma Endpoint |
|---|---|---|
| `list_invoices` | List issued invoices with optional filters (date range, type, limit) | `GET /fakturakraj/list.json` |
| `get_invoice` | Fetch a specific invoice by ID (full details including line items, KSeF status) | `GET /fakturakraj/{id}.json` |
| `create_domestic_invoice` | Issue a domestic sales invoice (faktura krajowa) for VAT payers | `POST /fakturakraj.json` |
| `create_domestic_invoice_non_vat` | Issue a domestic invoice for non-VAT payers (nievatowiec) | `POST /fakturakraj2.json` |
| `create_proforma` | Issue a pro forma invoice | `POST /fakturaproforma.json` |
| `create_export_invoice` | Issue an export invoice | `POST /fakturaeksport.json` |
| `create_wdt_invoice` | Issue an intra-community supply invoice (WDT) | `POST /fakturawdt.json` |
| `create_eu_service_invoice` | Issue art. 28b EU service invoice | `POST /fakturaunijnasluga.json` |
| `create_foreign_currency_invoice` | Issue invoice with foreign currency pricing | `POST /fakturakrajwaluta.json` |
| `create_correction_invoice` | Issue a correction invoice (faktura korygująca) | `POST /fakturakrajkorekta.json` |
| `create_receipt_invoice` | Issue invoice for a receipt (faktura do paragonu) | `POST /fakturadoparagonu.json` |
| `create_oss_invoice` | Issue an OSS invoice | `POST /fakturaoss.json` |
| `create_ioss_invoice` | Issue an IOSS invoice | `POST /fakturaioss.json` |
| `send_invoice_email` | Email an invoice to contractor | `POST /fakturakraj/{id}/wyslij-email.json` |
| `send_invoice_post` | Send invoice via traditional mail | `POST /fakturakraj/{id}/wyslij-poczta.json` |
| `send_invoice_ksef` | Submit invoice to KSeF | `POST /fakturakraj/{id}/ksef.json` |

### 7.2 Payments (`faktura` key)

| Tool | Description | iFirma Endpoint |
|---|---|---|
| `register_payment` | Register a payment received against an invoice | `POST /fakturakraj/{id}/wplata.json` |

### 7.3 Expenses (`wydatek` key)

| Tool | Description | iFirma Endpoint |
|---|---|---|
| `create_goods_purchase_expense` | Book an invoice for goods/materials purchase | `POST /zakuptowaruvat.json` |
| `create_cost_expense` | Book an invoice as a business cost | `POST /kosztdzialalnoscivat.json` |
| `create_other_cost_expense` | Book a non-invoice document as cost (receipt, contract, etc.) | `POST /kosztdzialalnosci.json` |
| `create_telecom_expense` | Book a phone/internet expense | `POST /oplatatelefon.json` |

### 7.4 Contractors (`abonent` key)

| Tool | Description | iFirma Endpoint |
|---|---|---|
| `search_contractors` | Search contractors by name/NIP | `GET /kontrahenci/szukaj.json` |
| `get_contractor` | Get full contractor details by ID | `GET /kontrahenci/{id}.json` |
| `create_contractor` | Add a new contractor to the database | `POST /kontrahenci.json` |
| `update_contractor` | Update existing contractor details | `PUT /kontrahenci/{id}.json` |

### 7.5 Orders (dedicated auth — see iFirma docs)

| Tool | Description | iFirma Endpoint |
|---|---|---|
| `create_order` | Create a new order (zamówienie) | `POST /zamowienia.json` |

### 7.6 Account (`abonent` key)

| Tool | Description | iFirma Endpoint |
|---|---|---|
| `get_accounting_month` | Get currently set accounting month | `GET /miesiac-ksiegowy.json` |
| `set_accounting_month` | Change the active accounting month | `PUT /miesiac-ksiegowy.json` |
| `get_api_limits` | Check remaining daily/minute API request limits | `GET /limit.json` |
| `get_eu_vat_rates` | Get VAT rates for all EU countries | `GET /stawki-vat-ue.json` |

### 7.7 HR (`abonent` key)

| Tool | Description | iFirma Endpoint |
|---|---|---|
| `manage_employee_questionnaire` | Manage employee personal questionnaires | `POST /kwestionariusz.json` |

---

## 8. Example Tool Implementation

```typescript
// src/tools/invoices.ts

import { z } from "zod";
import type { IfirmaClient } from "../client/api.js";

export const listInvoicesSchema = z.object({
  type: z
    .enum(["krajowa", "proforma", "eksport", "wdt", "oss", "ioss"])
    .default("krajowa")
    .describe("Invoice type to list"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(25)
    .describe("Number of invoices to return"),
  offset: z
    .number()
    .min(0)
    .default(0)
    .describe("Offset for pagination"),
});

export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;

const TYPE_TO_PATH: Record<string, string> = {
  krajowa: "fakturakraj",
  proforma: "fakturaproforma",
  eksport: "fakturaeksport",
  wdt: "fakturawdt",
  oss: "fakturaoss",
  ioss: "fakturaioss",
};

export async function listInvoices(
  client: IfirmaClient,
  input: ListInvoicesInput
) {
  const path = TYPE_TO_PATH[input.type] ?? "fakturakraj";

  return client.request({
    method: "GET",
    path: `${path}/list.json`,
    keyName: "faktura",
    params: {
      limit: String(input.limit),
      offset: String(input.offset),
    },
  });
}

// --- Create domestic invoice ---

const invoiceLineItemSchema = z.object({
  name: z.string().describe("Product or service name"),
  unit: z.string().default("szt.").describe("Unit (szt., godz., usł., etc.)"),
  quantity: z.number().positive().describe("Quantity"),
  unitNetPrice: z.number().positive().describe("Net price per unit in PLN"),
  vatRate: z.number().describe("VAT rate as percentage (23, 8, 5, 0) or -1 for exempt (zw.)"),
  pkwiu: z.string().optional().describe("PKWiU classification code (optional)"),
  gtu: z.string().optional().describe("GTU symbol for JPK reporting (e.g. GTU_12)"),
});

export const createDomesticInvoiceSchema = z.object({
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Issue date (YYYY-MM-DD)"),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Sale date if different from issue date"),
  paymentDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Payment deadline (YYYY-MM-DD)"),
  paymentMethod: z.enum(["przelew", "gotowka", "karta", "kompensata", "barter"]).default("przelew").describe("Payment method"),
  contractorNip: z.string().optional().describe("Contractor NIP — if exists in database, will be matched automatically"),
  contractor: z.object({
    name: z.string().describe("Contractor company name"),
    nip: z.string().optional(),
    street: z.string().optional(),
    postalCode: z.string(),
    city: z.string(),
    country: z.string().default("Polska"),
    email: z.string().optional(),
  }).optional().describe("Contractor details — only needed if not in database"),
  items: z.array(invoiceLineItemSchema).min(1).describe("Invoice line items"),
  notes: z.string().optional().describe("Additional notes on the invoice"),
  splitPayment: z.boolean().default(false).describe("Mark with Mechanizm Podzielonej Płatności"),
  noSignature: z.boolean().default(false).describe("Issue without receiver/issuer signature"),
  accountNumber: z.string().optional().describe("Bank account number (overrides default)"),
});
```

---

## 9. Server Entry Point

```typescript
// src/index.ts

#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { IfirmaClient } from "./client/api.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerExpenseTools } from "./tools/expenses.js";
import { registerContractorTools } from "./tools/contractors.js";
import { registerAccountTools } from "./tools/account.js";
import { registerPaymentTools } from "./tools/payments.js";
import { registerKsefTools } from "./tools/ksef.js";
import { registerOrderTools } from "./tools/orders.js";

async function main() {
  const config = loadConfig();
  const client = new IfirmaClient(config);

  const server = new McpServer({
    name: "ifirma-mcp-server",
    version: "1.0.0",
  });

  // Register tools based on which API keys are provided
  if (config.keys.faktura) {
    registerInvoiceTools(server, client);
    registerPaymentTools(server, client);
    registerKsefTools(server, client);
  }

  if (config.keys.wydatek) {
    registerExpenseTools(server, client);
  }

  if (config.keys.abonent) {
    registerContractorTools(server, client);
    registerAccountTools(server, client);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
```

---

## 10. Testing Strategy

Since we don't have iFirma API access, testing focuses on everything up to the HTTP boundary.

### Unit tests (no API access needed)

| Area | What to test |
|---|---|
| **Auth signing** | Verify HMAC-SHA1 computation matches expected output for known inputs. Test URL parameter stripping. Test all key types. |
| **Request construction** | Verify JSON body shapes match iFirma's documented schemas for every invoice/expense type. |
| **Zod schemas** | Test validation: required fields, date formats, NIP format, enum values, numeric bounds. |
| **Config parsing** | Missing env vars, partial key sets, invalid values. |
| **Error handling** | API error parsing, missing key for scope, network errors. |

### Integration tests (requires iFirma credentials)

These live in `tests/integration/` and are **skipped by default** (gated on `IFIRMA_INTEGRATION=true` env var). Contributors with iFirma accounts can run them.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    exclude: process.env.IFIRMA_INTEGRATION
      ? []
      : ["tests/integration/**"],
  },
});
```

### Dry-run mode

The server supports a `--dry-run` flag that logs the full HTTP request (method, URL, headers, body) without sending it. Useful for debugging and for contributors without API access.

```bash
IFIRMA_DRY_RUN=true npx ifirma-mcp-server
```

---

## 11. Build & Bundle

```typescript
// tsup.config.ts

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  outDir: "dist",
  clean: true,
  dts: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Bundle everything into a single file
  // Only externalize the MCP SDK (it's a peer dependency)
  noExternal: [/.*/],
  external: ["@modelcontextprotocol/sdk"],
});
```

```jsonc
// package.json (relevant fields)
{
  "name": "ifirma-mcp-server",
  "version": "0.1.0",
  "description": "MCP server for the iFirma.pl Polish accounting API",
  "keywords": [
    "mcp",
    "ifirma",
    "accounting",
    "invoicing",
    "poland",
    "faktura",
    "księgowość",
    "jdg",
    "ksef"
  ],
  "license": "MIT",
  "type": "module",
  "bin": {
    "ifirma-mcp-server": "dist/index.js"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "tsup": "^8.x",
    "tsx": "^4.x",
    "typescript": "^5.x",
    "vitest": "^2.x",
    "@biomejs/biome": "^1.x"
  }
}
```

---

## 12. Distribution & Installation

### For end users

**Option A: npx (zero install, recommended)**

Add to Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ifirma": {
      "command": "npx",
      "args": ["-y", "ifirma-mcp-server"],
      "env": {
        "IFIRMA_USERNAME": "your@email.pl",
        "IFIRMA_API_KEY_INVOICE": "your_hex_key_here",
        "IFIRMA_API_KEY_EXPENSE": "your_hex_key_here",
        "IFIRMA_API_KEY_ACCOUNT": "your_hex_key_here"
      }
    }
  }
}
```

**Option B: Claude Code**

```bash
claude mcp add ifirma -- npx -y ifirma-mcp-server
# Then set env vars in claude settings or shell profile
```

**Option C: Global install**

```bash
npm install -g ifirma-mcp-server
```

### Getting iFirma API keys

The README must include step-by-step instructions (with screenshots if possible):

1. Log in to ifirma.pl
2. Go to Settings → API
3. Generate keys for: Faktura, Wydatek, Abonent
4. Copy the hex keys into env vars

---

## 13. Open Source Setup

### Repository

- **Host:** GitHub (`github.com/adrianmaj/ifirma-mcp-server` or similar)
- **License:** MIT — permissive, consistent with MCP ecosystem
- **Visibility:** Public from day one

### README.md structure

```
# ifirma-mcp-server

[badges: npm version, license, CI status, MCP compatible]

Polish (PL) description first — this is primarily for Polish users.
English description below.

## Instalacja / Installation
## Konfiguracja / Configuration
## Dostępne narzędzia / Available Tools
  - Table of all tools with descriptions (bilingual)
## Przykłady / Examples
  - Real-world conversation examples showing Claude using the tools
## Rozwój / Development
  - How to build, test, contribute
## Licencja / License
```

### CONTRIBUTING.md

```markdown
# Contributing

## Prerequisites
- Node.js >= 18
- npm

## Setup
git clone ...
npm install
npm run dev

## Testing
npm test                           # unit tests (no API access needed)
IFIRMA_INTEGRATION=true npm test   # integration tests (requires credentials)

## Without iFirma API access
You can still contribute! The auth signing, request construction, and
schema validation can all be tested without credentials. Use dry-run
mode to verify request shapes:

IFIRMA_DRY_RUN=true npm run dev

## Pull Requests
- All PRs require passing CI (lint + unit tests)
- Use changesets: `npx changeset` before submitting
- Keep tool implementations consistent with existing patterns
```

### GitHub Actions

**CI (`.github/workflows/ci.yml`):**

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

**Publish (`.github/workflows/publish.yml`):**

```yaml
name: Publish
on:
  push:
    tags: ["v*"]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: "https://registry.npmjs.org"
      - run: npm ci
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - name: GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

### Versioning

- Use [Changesets](https://github.com/changesets/changesets) for version management
- Follow [Semantic Versioning](https://semver.org/)
- Breaking changes (tool renames, removed params) = major
- New tools = minor
- Bug fixes = patch

---

## 14. npm Publishing Checklist

Before first `npm publish`:

1. **Claim the package name** — `npm whoami` and `npm publish --dry-run`
2. **Set up npm provenance** — enabled in the GitHub Action above via `--provenance` flag
3. **Add npm 2FA** on your account
4. **Verify `files` in package.json** — only `dist/` ships to npm, no source or tests
5. **Test the npx flow** locally:
   ```bash
   npm run build
   npm pack
   # In a temp dir:
   npx ./ifirma-mcp-server-0.1.0.tgz
   ```
6. **Add to MCP server registries:**
   - [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — submit PR to add to community servers list
   - [Smithery.ai](https://smithery.ai) — register for discoverability
   - [mcp.run](https://mcp.run) — if available, list there too
   - [glama.ai](https://glama.ai/mcp/servers) — MCP server directory

---

## 15. Implementation Phases

### Phase 1 — Foundation (v0.1.0)

- [ ] Project scaffold (tsconfig, tsup, biome, vitest)
- [ ] Config and env var loading
- [ ] Auth layer (HMAC-SHA1 signing) with unit tests
- [ ] HTTP client with error handling
- [ ] Read-only tools: `list_invoices`, `get_invoice`, `get_contractor`, `search_contractors`, `get_accounting_month`, `get_api_limits`
- [ ] Dry-run mode
- [ ] README (bilingual)
- [ ] CI pipeline
- [ ] First npm publish

### Phase 2 — Write Operations (v0.2.0)

- [ ] `create_domestic_invoice` (the big one — most complex schema)
- [ ] `create_proforma`
- [ ] `create_cost_expense`, `create_goods_purchase_expense`
- [ ] `create_contractor`, `update_contractor`
- [ ] `register_payment`
- [ ] Integration test suite (gated)

### Phase 3 — Full Coverage (v0.3.0)

- [ ] All invoice types: WDT, export, EU service, foreign currency, OSS, IOSS
- [ ] Correction invoices
- [ ] All expense types: telecom, other documents
- [ ] `send_invoice_email`, `send_invoice_post`
- [ ] `create_order`
- [ ] Employee questionnaire tools

### Phase 4 — KSeF & Polish (v1.0.0)

- [ ] KSeF submission tools
- [ ] JPK procedure marking support
- [ ] GTU symbol handling
- [ ] Comprehensive README with screenshots
- [ ] Submission to MCP community server lists
- [ ] v1.0.0 stable release

---

## 16. MCP Server Registration & Listing

To maximize visibility in the Polish developer community:

### Official MCP ecosystem

Submit PR to [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) repository to be listed as a community server. This is the primary directory Claude Desktop and other clients reference.

### Third-party directories

| Directory | URL | Notes |
|---|---|---|
| Smithery | smithery.ai | Largest MCP server marketplace |
| Glama | glama.ai/mcp/servers | Curated directory |
| MCP.run | mcp.run | Managed MCP hosting (future option) |

### Polish tech community

- Post on Polish tech forums (4programmers.net, various Discords)
- Write a blog post explaining the project (in Polish)
- Share on X/LinkedIn with #MCP #iFirma #JDG tags

---

## 17. Open Questions

Items to validate once API access is available:

1. **Invoice list response format** — the docs don't show the response shape for list endpoints. Need to capture actual responses to build proper types.
2. **Error response format** — need to understand the error JSON structure for better error messages.
3. **Rate limiting behavior** — how does the API signal limit exceeded? HTTP 429? Custom error code?
4. **Accounting month scope** — do all operations automatically use the set month, or is it per-request?
5. **Order API auth** — the orders section mentions a separate authorization mechanism. Need to verify.
6. **PDF download** — can invoice PDFs be fetched via API? The docs mention document download but the endpoint isn't clear.

---

## 18. Example Conversations

These show what the end result looks like for users — a conversational interface to their accounting:

**Listing invoices:**
> User: "Show me invoices from this month"
> Claude: Uses `list_invoices` with date range filter → returns formatted list with numbers, amounts, payment status

**Creating an invoice:**
> User: "Invoice Acme sp. z o.o., NIP 1234567890, for 10 hours of frontend consulting at 200 PLN/hr net, 23% VAT, 14 day payment term"
> Claude: Uses `search_contractors` to find Acme → uses `create_domestic_invoice` with line items → returns invoice number and total

**Booking an expense:**
> User: "Book this month's Hetzner server bill, 49 EUR, invoice FV/2026/03/001"
> Claude: Uses `create_cost_expense` with foreign currency details → confirms booking

**Checking payments:**
> User: "Has Acme paid their February invoice?"
> Claude: Uses `list_invoices` filtered to Acme → checks payment status → reports outstanding amount
