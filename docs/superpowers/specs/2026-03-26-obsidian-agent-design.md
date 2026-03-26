# Obsidian MCP Agent — Design Spec

> Approved: 2026-03-26

## Goal

Build a Claude Code CLI agent that can fully read, write, update, and organize an Obsidian vault via a local MCP server, with 11 typed tools covering all note operations.

## Vault Structure

```
obsidian/
├── Inbox/          # Quick captures, unsorted
├── Projects/       # Work notes, meeting notes, project docs
├── Resources/      # Research, learning, book notes
├── Ideas/          # Brainstorms, shower thoughts
├── Tasks/          # Todos, goals
├── Archive/        # Completed/inactive (soft-delete target)
├── Templates/      # Note templates (meeting, project, research, idea, secret)
├── Secrets/        # API keys, configs, endpoints (git-ignored, search-excluded)
└── .mcp/
    └── obsidian-server/   # TypeScript MCP server
```

## Frontmatter Schema

```yaml
---
title: string
date: YYYY-MM-DD
tags: string[]
status: active | archived | draft
related: string[]   # wikilinks
# optional:
service: string     # Secrets/ only
source: string      # Resources/ only
---
```

## MCP Tool API

| Tool | Required Inputs | Optional Inputs |
|------|----------------|-----------------|
| `create_note` | title, folder | tags, content, template |
| `read_note` | title_or_path | — |
| `update_note` | title_or_path, content | mode (overwrite\|append) |
| `delete_note` | title_or_path | — |
| `search_notes` | query | folder, tags, include_secrets |
| `list_notes` | — | folder, tag, status |
| `move_note` | title_or_path, destination | — |
| `get_backlinks` | title | — |
| `daily_note` | — | date |
| `read_secret` | title | — |
| `write_secret` | title, content | service |

## Security Constraints

- `Secrets/` excluded from `search_notes` by default
- `delete_note` always moves to `Archive/` with timestamp prefix — never hard-deletes
- `Secrets/` is git-ignored
