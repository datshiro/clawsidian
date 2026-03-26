# Obsidian Vault — Claude Conventions

## Folder Guide

| Folder | When to use |
|--------|-------------|
| Inbox/ | Quick captures, daily notes, unsorted material |
| Projects/ | Work notes, meeting notes, project docs |
| Resources/ | Research, learning, book notes, references |
| Ideas/ | Brainstorms, shower thoughts, half-baked concepts |
| Tasks/ | Todos, goals, OKRs |
| Archive/ | Completed or inactive notes (never delete directly) |
| Templates/ | Note templates — do not modify without asking |
| Secrets/ | API keys, credentials, configs, endpoints |

## Rules

1. Always use the MCP tools (`create_note`, `read_note`, etc.) — never raw file operations.
2. Use `[[Note Title]]` wikilink format when referencing other notes.
3. Every note must have frontmatter: title, date, tags, status, related.
4. `delete_note` moves to Archive/ — it does NOT permanently delete.
5. `search_notes` excludes Secrets/ by default. Use `read_secret` / `write_secret` explicitly.
6. Match template to content type: meeting → Projects/, research → Resources/, idea → Ideas/, secret → Secrets/.

## Frontmatter Schema

```yaml
---
title: Note Title
date: YYYY-MM-DD
tags: []
status: active   # active | archived | draft
related: []
---
```
