# Clawsidian

> An Obsidian vault with an AI brain built in — Claude can read, write, and organize your notes through a local MCP server.

This repository is both an **Obsidian vault** and an **AI-native knowledge base**. It ships with a Model Context Protocol (MCP) server that gives Claude direct, structured access to your notes — without any cloud sync, third-party API, or data leaving your machine.

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
You ──── Claude ──── obsidian-mcp ──── your .md files
```

Claude connects to the `obsidian-mcp` server via the [Model Context Protocol](https://modelcontextprotocol.io). The server exposes 11 tools — create, read, search, move, archive, link notes, manage daily journals, and store secrets. Claude uses these tools the same way it would call any function: with structured arguments, validated inputs, and safe file operations.

Your notes are plain `.md` files with YAML frontmatter. Everything is readable without Claude, editable in any text editor, and fully compatible with the Obsidian app.

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) v18+
- [Obsidian](https://obsidian.md) (optional — vault is plain markdown)
- [Claude Code](https://claude.ai/code) or another MCP-compatible AI host

### 1. Clone the vault

```bash
git clone https://github.com/datshiro/clawsidian.git
cd clawsidian
```

### 2. Install and link the MCP server

```bash
cd .mcp/obsidian-server
npm install
npm link
```

This builds the TypeScript and registers `obsidian-mcp` as a global command. You only need to do this once.

### 3. Configure your MCP host

The `.mcp.json` in the vault root is already configured:

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

Update `VAULT_PATH` to match where you cloned the repo, then restart Claude Code. The `obsidian` server will appear automatically.

### 4. Use it in any other project

Since the server is installed globally, you can connect any project to this vault (or any other vault) by dropping a `.mcp.json` in that project's root:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "obsidian-mcp",
      "env": {
        "VAULT_PATH": "/path/to/any/vault"
      }
    }
  }
}
```

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

## Things you can ask Claude

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
