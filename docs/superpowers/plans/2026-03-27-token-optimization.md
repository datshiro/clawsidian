# Token Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mode and fields parameters to read_note, search_notes, list_notes to reduce token usage in MCP responses while maintaining backward compatibility.

**Architecture:** Add response filtering layer in vault.ts that transforms Note objects based on mode/fields. Index.ts passes these params through and applies filtering before returning results.

**Tech Stack:** TypeScript, existing MCP server (no new deps)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `.mcp/obsidian-server/src/vault.ts` | Modify | Add filterNote() function for response transformation |
| `.mcp/obsidian-server/src/vault.test.ts` | Modify | Add tests for filterNote() behavior |
| `.mcp/obsidian-server/src/index.ts` | Modify | Add mode/fields to tool schemas and handlers |

---

## Task 1: Add filterNote() to vault.ts

**Files:**
- Modify: `.mcp/obsidian-server/src/vault.ts`
- Test: `.mcp/obsidian-server/src/vault.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `.mcp/obsidian-server/src/vault.test.ts`:

```typescript
describe('filterNote', () => {
  it('returns full note in "full" mode', async () => {
    const note = createTestNote();
    const result = filterNote(note, 'full');
    expect(result.content).toBeDefined();
    expect(result.frontmatter).toBeDefined();
  });

  it('excludes frontmatter in "content" mode', async () => {
    const note = createTestNote();
    const result = filterNote(note, 'content');
    expect(result.content).toBe('Test content');
    expect(result.frontmatter).toBeUndefined();
  });

  it('returns only summary fields in "summary" mode', async () => {
    const note = createTestNote();
    const result = filterNote(note, 'summary');
    expect(result.frontmatter?.title).toBe('Test Note');
    expect(result.frontmatter?.tags).toEqual(['test']);
    expect(result.content).toBeUndefined();
  });

  it('filters specific fields when fields param provided', async () => {
    const note = createTestNote();
    const result = filterNote(note, 'full', ['title', 'tags']);
    expect(result.frontmatter?.title).toBe('Test Note');
    expect(result.frontmatter?.tags).toEqual(['test']);
    expect(result.frontmatter?.date).toBeUndefined();
    expect(result.frontmatter?.status).toBeUndefined();
    expect(result.content).toBeUndefined();
  });

  it('combines mode and fields - content mode with fields', async () => {
    const note = createTestNote();
    const result = filterNote(note, 'content', ['title']);
    expect(result.content).toBe('Test content');
    expect(result.frontmatter?.title).toBe('Test Note');
    expect(result.frontmatter?.tags).toBeUndefined();
  });
});

// Helper
function createTestNote(): Note {
  return {
    path: '/test/Test-Note.md',
    frontmatter: {
      title: 'Test Note',
      date: '2026-03-27',
      tags: ['test'],
      status: 'active',
      related: [],
    },
    content: 'Test content',
    raw: 'raw content',
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npx vitest run src/vault.test.ts -t "filterNote"
```

Expected: FAIL — "filterNote is not defined"

- [ ] **Step 3: Implement filterNote in vault.ts**

Add to `.mcp/obsidian-server/src/vault.ts` (after Note interface, before exports):

```typescript
export type ResponseMode = 'full' | 'content' | 'summary';

export interface FilterOptions {
  mode: ResponseMode;
  fields?: string[];
}

export function filterNote(note: Note, mode: ResponseMode, fields?: string[]): Partial<Note> {
  const result: Partial<Note> = {};

  // Handle content based on mode
  if (mode === 'content' || mode === 'full') {
    result.content = note.content;
  }

  // Handle frontmatter based on mode
  if (mode === 'full' || mode === 'summary') {
    const fm = note.frontmatter;
    
    if (fields && fields.length > 0) {
      // Filter specific fields
      result.frontmatter = {} as NoteFrontmatter;
      for (const field of fields) {
        if (field in fm) {
          (result.frontmatter as Record<string, unknown>)[field] = fm[field as keyof NoteFrontmatter];
        }
      }
    } else if (mode === 'full') {
      // Full mode without fields = all frontmatter
      result.frontmatter = fm;
    } else if (mode === 'summary') {
      // Summary mode: only title, tags, date, status
      result.frontmatter = {
        title: fm.title,
        date: fm.date,
        tags: fm.tags,
        status: fm.status,
      } as NoteFrontmatter;
    }
  }

  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npx vitest run src/vault.test.ts -t "filterNote"
```

Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/lap16932/personal/obsidian
git add .mcp/obsidian-server/src/vault.ts .mcp/obsidian-server/src/vault.test.ts
git commit -m "feat: add filterNote() for response mode/fields control"
```

---

## Task 2: Update index.ts Tool Schemas

**Files:**
- Modify: `.mcp/obsidian-server/src/index.ts`

- [ ] **Step 1: Update read_note schema**

Find the read_note tool definition in ListToolsRequestSchema handler and add mode/fields:

```typescript
{
  name: 'read_note',
  description: 'Read a note by title or path. Use mode param to control response verbosity.',
  inputSchema: {
    type: 'object',
    properties: {
      title_or_path: { type: 'string', description: 'Note title or absolute file path' },
      mode: {
        type: 'string',
        enum: ['full', 'content', 'summary'],
        default: 'full',
        description: 'full=raw markdown, content=body only, summary=title/tags/date only',
      },
      fields: {
        type: 'array',
        items: { type: 'string', enum: ['title', 'date', 'tags', 'status', 'related', 'content'] },
        description: 'Specific fields to return (combines with mode)',
      },
    },
    required: ['title_or_path'],
  },
},
```

- [ ] **Step 2: Update search_notes schema**

```typescript
{
  name: 'search_notes',
  description: 'Full-text search across vault. Excludes Secrets/ by default. Use mode/fields to reduce response size.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
      folder: { type: 'string', description: 'Limit search to folder' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
      include_secrets: { type: 'boolean', default: false },
      mode: {
        type: 'string',
        enum: ['full', 'content', 'summary'],
        default: 'full',
      },
      fields: {
        type: 'array',
        items: { type: 'string', enum: ['title', 'date', 'tags', 'status', 'related', 'content'] },
      },
    },
    required: ['query'],
  },
},
```

- [ ] **Step 3: Update list_notes schema**

```typescript
{
  name: 'list_notes',
  description: 'List notes, optionally filtered by folder, tag, or status. Use mode/fields for lighter responses.',
  inputSchema: {
    type: 'object',
    properties: {
      folder: { type: 'string' },
      tag: { type: 'string' },
      status: { type: 'string', enum: ['active', 'archived', 'draft'] },
      mode: {
        type: 'string',
        enum: ['full', 'content', 'summary'],
        default: 'summary',
      },
      fields: {
        type: 'array',
        items: { type: 'string', enum: ['title', 'date', 'tags', 'status', 'related', 'content'] },
      },
    },
  },
},
```

- [ ] **Step 4: Update call handlers to use filterNote**

Find each case in CallToolRequestSchema handler and update:

**read_note case:**
```typescript
case 'read_note': {
  const { title_or_path, mode = 'full', fields } = args as {
    title_or_path: string;
    mode?: ResponseMode;
    fields?: string[];
  };
  const note = await readNote(title_or_path);
  const filtered = filterNote(note, mode, fields);
  const output = mode === 'full' ? note.raw : JSON.stringify(filtered);
  return { content: [{ type: 'text', text: output }] };
}
```

**search_notes case:**
```typescript
case 'search_notes': {
  const { query, folder, tags, include_secrets = false, mode = 'full', fields } = args as {
    query: string; folder?: string; tags?: string[]; include_secrets?: boolean;
    mode?: ResponseMode; fields?: string[];
  };
  const notes = await searchNotes(query, folder, tags, include_secrets);
  const filtered = notes.map(n => filterNote(n, mode, fields));
  return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
}
```

**list_notes case:**
```typescript
case 'list_notes': {
  const { folder, tag, status, mode = 'summary', fields } = args as {
    folder?: string; tag?: string; status?: string;
    mode?: ResponseMode; fields?: string[];
  };
  const notes = await listNotes(folder, tag, status);
  const filtered = notes.map(n => filterNote(n, mode, fields));
  return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
}
```

- [ ] **Step 5: Import filterNote and ResponseMode**

At top of index.ts, add:

```typescript
import { filterNote, type ResponseMode } from './vault.js';
```

- [ ] **Step 6: Build and verify**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 7: Commit**

```bash
cd /Users/lap16932/personal/obsidian
git add .mcp/obsidian-server/src/index.ts
git commit -m "feat: add mode/fields params to read, search, list tools"
```

---

## Task 3: Integration Tests

- [ ] **Step 1: Test the new parameters work**

Start a new Claude Code session and test:

```bash
# Full mode (default)
read_note title_or_path: "Test Note"

# Content mode
read_note title_or_path: "Test Note", mode: "content"

# Summary mode
read_note title_or_path: "Test Note", mode: "summary"

# With fields
read_note title_or_path: "Test Note", mode: "full", fields: ["title", "tags"]

# Search with mode
search_notes query: "test", mode: "summary"

# List with mode (default is summary now)
list_notes folder: "Projects"
```

- [ ] **Step 2: Final commit**

```bash
cd /Users/lap16932/personal/obsidian
git add .
git commit -m "feat: complete token optimization - mode/fields params on read operations"
```

---

## Summary of Changes

| Change | Token Savings |
|--------|---------------|
| `mode: "content"` | ~60-80% |
| `mode: "summary"` | ~90%+ |
| `fields: ["title", "tags"]` | Minimal for lists |

**Backward compatible:** Default mode is "full" for read_note/search_notes, "summary" for list_notes (already lightweight).