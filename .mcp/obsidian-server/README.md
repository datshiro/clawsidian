# obsidian-mcp

> Give your AI a brain that remembers — connect Claude (or any MCP-compatible AI) directly to your Obsidian vault.

`obsidian-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants read, write, search, and organize notes inside an Obsidian vault. Install it once globally, point it at any vault, and your AI gains a persistent, structured memory that lives on your own machine.

---

## What it is

A lightweight Node.js server that speaks the MCP protocol over stdio. When connected to Claude (or another MCP host), it exposes **11 tools** that give the AI full read/write access to your vault — notes, daily journals, secrets, backlinks, and more.

Everything stays local. No cloud sync, no third-party API. Just your files.

---

## What it can do

| Category | Capability |
|---|---|
| **Notes** | Create, read, update, archive, and move notes across folders |
| **Search** | Full-text search across the entire vault with tag and folder filters |
| **Daily notes** | Automatically create or fetch today's journal entry |
| **Backlinks** | Find every note that links to a given note via `[[wikilinks]]` |
| **Secrets** | Store and retrieve API keys, credentials, and configs in an isolated `Secrets/` folder — never exposed in search results |
| **Templates** | Scaffold new notes using built-in templates for meetings, projects, research, ideas, and secrets |
| **Response control** | Return full markdown, body-only, or lightweight summaries to keep AI context lean |

---

## What it helps you do

- **Let Claude write your meeting notes** while you talk — then ask it to summarize action items and file them in Tasks/
- **Ask "what have I been working on this week?"** — Claude searches your vault and synthesizes an answer
- **Build a second brain with AI** — capture ideas anywhere, let Claude link, tag, and organize them
- **Keep secrets safe** — store API keys in your vault and have Claude reference them without exposing them in conversation history
- **Never lose a daily note** — Claude creates today's journal automatically if it doesn't exist yet
- **Traverse your knowledge graph** — ask "what links to this note?" and explore your vault's connections

---

## Requirements

- [Node.js](https://nodejs.org) v18 or later
- An Obsidian vault (any folder of `.md` files works)
- An MCP-compatible AI host: [Claude Code](https://claude.ai/code), Claude Desktop, or any MCP client

---

## Installation

### 1. Clone and install

```bash
git clone <this-repo>
cd obsidian-mcp-server
npm install
```

### 2. Link globally

```bash
npm link
```

This compiles the TypeScript and registers `obsidian-mcp` as a global command on your `PATH`. You only do this once.

Verify it worked:

```bash
which obsidian-mcp
# → /usr/local/bin/obsidian-mcp  (or similar)
```

---

## Setup for any project

Add a `.mcp.json` file to the root of any project where you want vault access:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "obsidian-mcp",
      "env": {
        "VAULT_PATH": "/absolute/path/to/your/vault"
      }
    }
  }
}
```

That's it. Restart your MCP host (Claude Code, Claude Desktop, etc.) and the `obsidian` server will be available.

`VAULT_PATH` is the only thing that changes between projects. The binary stays the same everywhere.

---

## Vault structure

The server expects (but will create) this folder layout inside your vault:

```
vault/
├── Inbox/          # Quick captures, daily notes
├── Projects/       # Work notes, meeting notes
├── Resources/      # Research, book notes, references
├── Ideas/          # Brainstorms, half-baked concepts
├── Tasks/          # Todos, goals, OKRs
├── Archive/        # Completed notes (never permanently deleted)
├── Templates/      # Note templates
└── Secrets/        # API keys, credentials (excluded from search)
```

Every note is a `.md` file with YAML frontmatter:

```yaml
---
title: My Note
date: 2026-03-27
tags: [work, ideas]
status: active        # active | archived | draft
related: []
---

Note body goes here.
```

---

## Tools reference

### `create_note`
Create a new note in any folder. Optionally use a built-in template.

```
title      (required) Note title
folder     (required) Inbox | Projects | Resources | Ideas | Tasks
tags       Optional array of tags
content    Raw body content
template   meeting | project | research | idea | secret
```

### `read_note`
Read a note by title or file path.

```
title_or_path   (required) Note title or absolute .md path
mode            full (default) | content | summary
fields          ["title", "date", "tags", "status", "related", "content"]
```

Use `mode: "summary"` to get just title/tags/date without loading the full body — useful when scanning many notes.

### `update_note`
Overwrite or append to an existing note's body.

```
title_or_path   (required)
content         (required) New content
mode            overwrite (default) | append
```

### `delete_note`
Move a note to `Archive/` with a timestamp prefix. Never permanently deletes.

```
title_or_path   (required)
```

### `search_notes`
Full-text search across the vault. Excludes `Secrets/` by default.

```
query           (required) Search string
folder          Limit to a specific folder
tags            Filter by tags (array)
include_secrets false (default) | true
mode            full | content | summary (default: full)
fields          Specific fields to return
```

### `list_notes`
List notes, optionally filtered by folder, tag, or status.

```
folder   Filter by folder
tag      Filter by single tag
status   active | archived | draft
mode     full | content | summary (default: summary)
fields   Specific fields to return
```

### `move_note`
Move a note to a different folder.

```
title_or_path   (required)
destination     (required) Target folder name
```

### `get_backlinks`
Find all notes that link to a given note via `[[wikilinks]]`.

```
title   (required) Note title to look up
```

### `daily_note`
Fetch today's daily note from `Inbox/`, creating it if it doesn't exist yet.

```
date   YYYY-MM-DD (default: today)
```

### `read_secret`
Read a note from `Secrets/` by title. Always explicit — never appears in search results.

```
title   (required)
```

### `write_secret`
Create or update a note in `Secrets/`. Upserts safely — calling twice won't create a duplicate.

```
title     (required)
content   (required)
service   Optional service name (e.g. "OpenAI", "AWS")
```

---

## Response modes

All read operations (`read_note`, `search_notes`, `list_notes`) support a `mode` parameter that controls how much data is returned. This is especially useful when scanning large vaults to keep AI context usage low.

| Mode | Returns |
|---|---|
| `full` | Complete raw markdown including frontmatter |
| `content` | Body text only, no frontmatter |
| `summary` | Frontmatter fields only (title, date, tags, status) |

You can also pass `fields` to cherry-pick exactly what you need:

```
fields: ["title", "tags", "content"]
```

---

## Development

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Start server directly (for debugging)
VAULT_PATH=/path/to/vault npm start
```

The server communicates over stdio using the MCP JSON-RPC protocol. It will appear to hang when run directly in a terminal — that's expected. Use a tool like [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test it interactively.

### Re-linking after changes

If you modify the source, rebuild and re-link:

```bash
npm run build
# npm link is not needed again — the symlink already points to dist/
```

---

## Security notes

- **Path traversal protection** — all file access is validated to stay within `VAULT_PATH`
- **Secrets isolation** — `Secrets/` is excluded from all search and list operations unless explicitly opted in
- **No network access** — the server reads and writes only local files; no data leaves your machine
- **Archive, never delete** — `delete_note` moves to `Archive/` with a timestamp; nothing is permanently removed

---

## Troubleshooting

**`obsidian-mcp: command not found`**
Run `npm link` again from the project directory. If using nvm, ensure you're on the same Node version as when you linked.

**Server not appearing in Claude**
Check that `.mcp.json` is in the project root and `VAULT_PATH` points to a valid directory. Restart your MCP host after any config change.

**Notes not found by title**
The server matches by the `title` frontmatter field first, then falls back to the filename (without `.md`). Ensure your notes have consistent frontmatter.

**Secrets showing up in search**
They shouldn't — `Secrets/` is excluded by default. If you're seeing them, check that `include_secrets` is not set to `true` in your query.
