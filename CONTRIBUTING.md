# Contributing

## Prerequisites

- Node.js >= 18
- npm

## Setup

```bash
git clone https://github.com/adrianmaj/ifirma-mcp-server.git
cd ifirma-mcp-server
npm install
npm run dev
```

## Testing

```bash
npm test                           # unit tests (no API access needed)
IFIRMA_INTEGRATION=true npm test   # integration tests (requires credentials)
```

## Without iFirma API access

You can still contribute! The auth signing, request construction, and schema validation can all be tested without credentials. Use dry-run mode to verify request shapes:

```bash
IFIRMA_DRY_RUN=true npm run dev
```

## Pull Requests

- All PRs require passing CI (lint + unit tests)
- Keep tool implementations consistent with existing patterns
