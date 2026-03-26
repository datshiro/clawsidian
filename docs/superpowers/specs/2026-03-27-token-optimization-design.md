# Token Optimization for Obsidian MCP — Design Spec

> Approved: 2026-03-27

## Goal

Reduce token usage in MCP responses by adding mode and fields parameters to read operations, while maintaining backward compatibility.

## Problem

- MCP tools return full raw markdown including frontmatter for every response
- Large notes bloat context window unnecessarily
- No way for callers to request only what they need

## Solution

Add optional parameters to control response verbosity:

### New Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `mode` | string | "full" \| "content" \| "summary" (default: "full") |
| `fields` | string[] | Which specific fields to return |

### Mode Behavior

| Mode | Returns | Token Savings |
|------|---------|---------------|
| `full` | Raw markdown + frontmatter (default) | 0% — current behavior |
| `content` | Body content only, no frontmatter | ~60-80% |
| `summary` | title, tags, date, status only | ~90%+ |

### Fields Parameter

Allows granular field selection:
- `["title", "tags"]` — lightweight for lists/dashboards
- `["title", "content"]` — exclude frontmatter metadata
- Works in combination with mode

## Affected Tools

- `read_note` — primary read operation
- `search_notes` — returns array of notes
- `list_notes` — returns array of notes

Other tools (create_note, update_note, delete_note, move_note, etc.) unaffected — they don't return note content.

## Backward Compatibility

- Default `mode: "full"` preserves current behavior
- Omitting `fields` returns all fields
- Existing callers work unchanged

## Implementation Notes

1. Add response filtering in index.ts before returning results
2. Keep Note interface unchanged — filter at output time
3. Test all 3 modes for each affected tool
4. Document new parameters in tool descriptions