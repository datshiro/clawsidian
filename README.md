# Clawsidian

> An Obsidian vault with an AI brain built in — Claude, Gemini, and other AI tools can read, write, and organize your notes through a local MCP server.

This repository is both an **Obsidian vault** and an **AI-native knowledge base**. It ships with a Model Context Protocol (MCP) server that gives AI tools direct, structured access to your notes — without any cloud sync, third-party API, or data leaving your machine.

---

## What's inside

```
clawsidian/
├── Inbox/          # Quick captures and daily notes
├── Projects/       # Work notes, meetings, project docs
├── Resources/      # Research, learning, book notes
├── Ideas/          # Brainstorms and half-baked concepts
├── Tasks/          # Todos, goals, OKRs
├── Archive/        # Completed notes (never permanently deleted)
├── Templates/      # Note scaffolds (meeting, project, research, idea, secret)
├── Secrets/        # API keys and credentials (excluded from AI search)
├── docs/           # Project plans and design specs
└── .mcp/
    └── obsidian-server/   # The MCP server that connects Claude to this vault
```

---

## How it works

```
You ──── AI tool ──── obsidian-mcp ──── your .md files
```

Your AI tool connects to the `obsidian-mcp` server via the [Model Context Protocol](https://modelcontextprotocol.io). The server exposes 11 tools — create, read, search, move, archive, link notes, manage daily journals, and store secrets. The AI uses these tools the same way it would call any function: with structured arguments, validated inputs, and safe file operations.

Your notes are plain `.md` files with YAML frontmatter. Everything is readable without Claude, editable in any text editor, and fully compatible with the Obsidian app.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Obsidian](https://obsidian.md) (optional — vault is plain markdown)
- One of: [Claude Code](https://claude.ai/code), [Gemini CLI](https://github.com/google-gemini/gemini-cli), or [Opencode](https://opencode.ai)

### 1. Clone the vault

```bash
git clone https://github.com/datshiro/clawsidian.git
cd clawsidian
```

### 2. Build and link the MCP server

```bash
cd .mcp/obsidian-server
npm install
npm run build
npm link
cd ../..
```

This compiles the TypeScript and registers `obsidian-mcp` as a global command. Run once — no need to repeat after rebuilding.

Verify:

```bash
which obsidian-mcp   # should resolve to a global npm bin path
```

### 3. Connect your AI tool

---

#### Claude Code

The `.mcp.json` in the repo root is pre-configured. Update `VAULT_PATH` to the absolute path where you cloned the repo:

```bash
sed -i '' "s|\"VAULT_PATH\": \".*\"|\"VAULT_PATH\": \"$(pwd)\"|" .mcp.json
```

Restart Claude Code. The `obsidian` MCP server appears automatically — no further setup needed.

To use this vault from **any other project**, drop a `.mcp.json` there:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "obsidian-mcp",
      "env": {
        "VAULT_PATH": "/absolute/path/to/clawsidian"
      }
    }
  }
}
```

---

#### Gemini CLI

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

The extension is registered as `clawsidian` and `GEMINI.md` is loaded automatically as context. To make `VAULT_PATH` permanent, add it to your shell profile:

```bash
echo "export VAULT_PATH=/absolute/path/to/your/vault" >> ~/.zshrc   # or ~/.bashrc
```

To uninstall:

```bash
gemini extensions uninstall clawsidian
```

---

#### Opencode

Add the MCP server to your Opencode config. Run from the repo root:

```bash
VAULT=$(pwd)
OPENCODE_CONFIG="${HOME}/.config/opencode/config.json"
mkdir -p "$(dirname "$OPENCODE_CONFIG")"
[ -f "$OPENCODE_CONFIG" ] || echo '{}' > "$OPENCODE_CONFIG"

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
console.log('Done — obsidian server added to', '$OPENCODE_CONFIG');
"
```

Restart Opencode. The `obsidian` server will be available in all sessions.

---

---

## Note structure

Every note follows the same frontmatter schema:

```yaml
---
title: Note Title
date: 2026-03-27
tags: [work, ideas]
status: active        # active | archived | draft
related: []
---

Note body in plain markdown.
```

The `title` field should match the filename without `.md` (e.g. `My-Note.md` → `title: My Note`).

---

## Templates

Five built-in templates scaffold common note types automatically when you use `create_note` with a `template` param:

| Template | Folder | Sections |
|---|---|---|
| `meeting` | Projects/ | Attendees, Agenda, Notes, Action Items |
| `project` | Projects/ | Goal, Context, Tasks, Notes |
| `research` | Resources/ | Summary, Key Points, Source, Notes |
| `idea` | Ideas/ | The Idea, Why It Matters, Next Steps |
| `secret` | Secrets/ | Isolated, never in search results |

---

## Linking notes

Use Obsidian's `[[wikilink]]` syntax to connect notes:

```markdown
See also [[Project Alpha]] and [[Meeting 2026-03-27]].
```

Claude can find all notes that link to a given note using the `get_backlinks` tool, letting you traverse your knowledge graph conversationally.

---

## Secrets

The `Secrets/` folder is a first-class concept. Notes there are:

- **Never returned** by `search_notes` or `list_notes` unless explicitly opted in
- **Accessible only** via `read_secret` and `write_secret` tools
- Stored as regular `.md` files — encrypted at rest by your OS/disk encryption if enabled

Use secrets to store API keys, service credentials, environment configs, or anything you don't want surfacing in general AI context.

---

## MCP server

The server lives at `.mcp/obsidian-server/`. Full documentation including all 11 tools, response modes, and development instructions is in:

**[`.mcp/obsidian-server/README.md`](.mcp/obsidian-server/README.md)**

---

## Things you can ask your AI

Once connected, try:

- _"Create a meeting note for today's standup with the team"_
- _"What have I been working on this week?"_
- _"Search my Resources for anything about system design"_
- _"Add this idea to my Ideas folder: [your idea]"_
- _"What notes link to Project Alpha?"_
- _"Show me my daily note for today"_
- _"Save my OpenAI API key to secrets"_
- _"Move the note 'Draft Proposal' to Projects and mark it active"_

---

## Development

To modify the MCP server:

```bash
cd .mcp/obsidian-server
npm run dev       # TypeScript watch mode
npm test          # Run tests (29 tests)
npm run build     # Compile to dist/
```

Changes take effect immediately — no need to re-run `npm link` after rebuilding.
