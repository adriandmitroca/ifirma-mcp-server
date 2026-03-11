# Open Source Release Plan

## Pre-release Checklist

- [ ] Test all tools with real iFirma API credentials
- [ ] Fix any endpoint mismatches found during testing
- [ ] Remove `"private": true` from `package.json`
- [ ] Add `"prepublishOnly": "npm run build"` back to scripts
- [ ] Verify `npm pack` produces correct tarball (only `dist/`)
- [ ] Set up npm account and 2FA
- [ ] Create GitHub repo and push code
- [ ] Add `NPM_TOKEN` secret to GitHub repo settings

## npm Publishing

1. **Claim the package name:**
   ```bash
   npm whoami
   npm publish --dry-run
   ```

2. **First publish:**
   ```bash
   npm run build
   npm publish --access public
   ```

3. **Subsequent releases:**
   ```bash
   npm version patch|minor|major
   git push --follow-tags
   # GitHub Action handles npm publish on tag push
   ```

## Re-enable Automated Publishing

In `.github/workflows/publish.yml`, switch trigger from `workflow_dispatch` back to:
```yaml
on:
  push:
    tags: ["v*"]
```

## Distribution Channels

### Package Registries
- [ ] **npm** — primary distribution (`npx ifirma-mcp-server`)
- [ ] **GitHub Releases** — automated via CI on tag push

### MCP Server Directories
- [ ] [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — submit PR to community servers list
- [ ] [Smithery.ai](https://smithery.ai) — largest MCP marketplace
- [ ] [Glama.ai](https://glama.ai/mcp/servers) — curated MCP directory
- [ ] [mcp.run](https://mcp.run) — managed MCP hosting

### Polish Developer Community
- [ ] Post on [4programmers.net](https://4programmers.net)
- [ ] Share on X/LinkedIn with #MCP #iFirma #JDG #KSeF tags
- [ ] Write a blog post (Polish) explaining the project
- [ ] Submit to Polish tech Discord/Slack communities

## Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):
- **Patch** (0.1.x) — bug fixes, endpoint corrections
- **Minor** (0.x.0) — new tools added
- **Major** (x.0.0) — breaking changes (tool renames, removed params)

## Post-release

- [ ] Monitor GitHub Issues for bug reports
- [ ] Set up Dependabot for dependency updates
- [ ] Add npm provenance (`--provenance` flag already in CI)
- [ ] Consider adding Smithery manifest (`smithery.yaml`) for auto-discovery
