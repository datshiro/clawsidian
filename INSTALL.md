# INSTALL — Clawsidian MCP Server

> AI-readable installation instructions for connecting this vault's MCP server to GeminiCLI, Opencode, or Claude Code.

---

## What this installs

A local MCP server (`obsidian-mcp`) that gives AI tools structured read/write access to this Obsidian vault. The server exposes 11 tools: create, read, search, move, archive, link notes, manage daily journals, and store secrets.

**Server binary:** `obsidian-mcp` (Node.js, installed globally via `npm link`)
**Vault path:** the directory containing this file (detect with `pwd` or `realpath .`)

---

## Prerequisites

```bash
node --version    # must be v18+
npm --version     # must be v8+
```

---

## Step 1 — Build and link the MCP server (all tools)

Run once from the repo root:

```bash
cd .mcp/obsidian-server
npm install
npm run build
npm link
cd ../..
```

Verify:

```bash
which obsidian-mcp        # should resolve to a global npm bin path
obsidian-mcp --version    # should print without error
```

---

## Step 2 — Tool-specific configuration

### Claude Code

No extra steps. The `.mcp.json` in the repo root is already configured. Update `VAULT_PATH` to the absolute path of this repo, then restart Claude Code:

```bash
# Replace <this-repo-path> with the absolute path to this directory
VAULT=$(pwd)
sed -i '' "s|\"VAULT_PATH\": \".*\"|\"VAULT_PATH\": \"$VAULT\"|" .mcp.json
```

---

### GeminiCLI

Install directly from GitHub (requires git):

```bash
export VAULT_PATH=/absolute/path/to/your/vault
gemini extensions install https://github.com/datshiro/clawsidian
```

Or from a local clone:

```bash
export VAULT_PATH=$(pwd)
gemini extensions install $(pwd)
```

This reads `gemini-extension.json` at the repo root. The `obsidian` MCP server and `GEMINI.md` context are loaded automatically in all Gemini sessions.

To make `VAULT_PATH` permanent, add it to your shell profile:

```bash
echo "export VAULT_PATH=/absolute/path/to/your/vault" >> ~/.zshrc   # or ~/.bashrc
```

To uninstall:

```bash
gemini extensions uninstall clawsidian
```

---

### Opencode

Add the server to your Opencode config. Run from the repo root:

```bash
VAULT=$(pwd)
OPENCODE_CONFIG="${HOME}/.config/opencode/config.json"

# Create config dir if it doesn't exist
mkdir -p "$(dirname "$OPENCODE_CONFIG")"

# If config file doesn't exist, create a minimal one
[ -f "$OPENCODE_CONFIG" ] || echo '{}' > "$OPENCODE_CONFIG"

# Inject MCP server using node (avoids jq dependency)
node -e "
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('$OPENCODE_CONFIG', 'utf8'));
cfg.mcp = cfg.mcp || {};
cfg.mcp.servers = cfg.mcp.servers || {};
cfg.mcp.servers.obsidian = {
  type: 'local',
  command: ['obsidian-mcp'],
  env: { VAULT_PATH: '$VAULT' }
};
fs.writeFileSync('$OPENCODE_CONFIG', JSON.stringify(cfg, null, 2));
console.log('obsidian MCP server added to', '$OPENCODE_CONFIG');
"
```

Restart Opencode. The `obsidian` server will be available automatically.

To verify the entry was written:

```bash
cat ~/.config/opencode/config.json | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.log(JSON.stringify(d?.mcp?.servers?.obsidian, null, 2));
"
```

---

## Verification (all tools)

Once the server is registered, ask your AI tool:

> "List all notes in my vault"

or

> "Create a test note in Inbox called install-test"

A successful response confirms the MCP connection is live.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `obsidian-mcp: command not found` | Re-run `npm link` from `.mcp/obsidian-server/` |
| `VAULT_PATH not set` error | Export `VAULT_PATH` in your shell or update the config |
| Server connects but no notes found | Check `VAULT_PATH` points to the repo root (must contain `Inbox/`, `Projects/`, etc.) |
| `dist/index.js` missing | Run `npm run build` from `.mcp/obsidian-server/` |
| GeminiCLI extension not found | Ensure `gemini-extension.json` exists at repo root; re-run `gemini extensions install $(pwd)` |
