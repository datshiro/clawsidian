# Clawsidian — Obsidian Vault Context

You have access to an Obsidian vault through the `obsidian` MCP server.

## Available tools

| Tool | Purpose |
|------|---------|
| `create_note` | Create a new note (supports templates: meeting, project, research, idea, secret) |
| `read_note` | Read a note by title or path |
| `update_note` | Update an existing note's content or frontmatter |
| `delete_note` | Move a note to Archive/ (non-destructive) |
| `search_notes` | Full-text search across the vault (excludes Secrets/) |
| `list_notes` | List notes in a folder |
| `move_note` | Move or rename a note |
| `daily_note` | Read or create today's daily note |
| `get_backlinks` | Find all notes that link to a given note |
| `read_secret` | Read a note from Secrets/ |
| `write_secret` | Write a note to Secrets/ |

## Vault structure

```
vault/
├── Inbox/       # Quick captures, daily notes
├── Projects/    # Work notes, meetings, project docs
├── Resources/   # Research, learning, references
├── Ideas/       # Brainstorms, half-baked concepts
├── Tasks/       # Todos, goals, OKRs
├── Archive/     # Completed notes (never deleted)
├── Templates/   # Note scaffolds — do not modify
└── Secrets/     # API keys and credentials
```

## Rules

- Use `[[Note Title]]` wikilink syntax when referencing other notes.
- Every note has frontmatter: title, date, tags, status, related.
- Match template to content type: meeting/project → Projects/, research → Resources/, idea → Ideas/.
- `delete_note` archives, never permanently deletes.
- Secrets/ is isolated — use `read_secret`/`write_secret` explicitly.
