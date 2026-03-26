# Obsidian MCP Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript MCP server that exposes 11 vault tools to Claude Code CLI, enabling full read/write/search/organize operations on the Obsidian vault at `/Users/lap16932/personal/obsidian`.

**Architecture:** A stdio MCP server (`@modelcontextprotocol/sdk`) with three source files — `vault.ts` (all filesystem ops), `templates.ts` (template rendering), `index.ts` (MCP tool wiring). Claude Code connects via `settings.local.json` registration.

**Tech Stack:** TypeScript 5, Node.js, `@modelcontextprotocol/sdk@^1.0.0`, `gray-matter@^4.0.3`, `vitest@^1.0.0`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `.mcp/obsidian-server/package.json` | Create | npm project config, scripts, dependencies |
| `.mcp/obsidian-server/tsconfig.json` | Create | TypeScript compiler config |
| `.mcp/obsidian-server/src/vault.ts` | Create | All filesystem operations (CRUD, search, backlinks) |
| `.mcp/obsidian-server/src/templates.ts` | Create | Template file loading and `{{variable}}` substitution |
| `.mcp/obsidian-server/src/index.ts` | Create | MCP server entry point, tool definitions, request routing |
| `.mcp/obsidian-server/src/vault.test.ts` | Create | Vitest tests for vault operations using temp directory |
| `.mcp/obsidian-server/src/templates.test.ts` | Create | Vitest tests for template rendering |
| `Templates/meeting.md` | Create | Meeting note template |
| `Templates/project.md` | Create | Project doc template |
| `Templates/research.md` | Create | Research/book note template |
| `Templates/idea.md` | Create | Idea/brainstorm template |
| `Templates/secret.md` | Create | Secret/config template |
| `.gitignore` | Create | Ignore Secrets/, node_modules, dist |
| `CLAUDE.md` | Create | Vault conventions for Claude |
| `.claude/settings.local.json` | Modify | Register MCP server |

---

## Task 1: Vault Directory Structure + Git Config

**Files:**
- Create: `Inbox/.gitkeep`, `Projects/.gitkeep`, `Resources/.gitkeep`, `Ideas/.gitkeep`, `Tasks/.gitkeep`, `Archive/.gitkeep`, `Secrets/.gitkeep`
- Create: `.gitignore`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create vault folders**

```bash
cd /Users/lap16932/personal/obsidian
mkdir -p Inbox Projects Resources Ideas Tasks Archive Templates Secrets
touch Inbox/.gitkeep Projects/.gitkeep Resources/.gitkeep Ideas/.gitkeep Tasks/.gitkeep Archive/.gitkeep Secrets/.gitkeep
```

- [ ] **Step 2: Create .gitignore**

Create `/Users/lap16932/personal/obsidian/.gitignore`:
```
Secrets/
.mcp/obsidian-server/node_modules/
.mcp/obsidian-server/dist/
```

- [ ] **Step 3: Create CLAUDE.md**

Create `/Users/lap16932/personal/obsidian/CLAUDE.md`:
```markdown
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
```

- [ ] **Step 4: Verify structure**

```bash
ls /Users/lap16932/personal/obsidian/
```

Expected: `Archive  Ideas  Inbox  Projects  Resources  Secrets  Tasks  Templates  docs  .gitignore  CLAUDE.md`

---

## Task 2: Note Templates

**Files:**
- Create: `Templates/meeting.md`
- Create: `Templates/project.md`
- Create: `Templates/research.md`
- Create: `Templates/idea.md`
- Create: `Templates/secret.md`

- [ ] **Step 1: Create meeting template**

Create `/Users/lap16932/personal/obsidian/Templates/meeting.md`:
```markdown
---
title: {{title}}
date: {{date}}
tags: [meeting]
status: active
related: []
---

## Attendees

## Agenda

## Notes

## Action Items
- [ ]
```

- [ ] **Step 2: Create project template**

Create `/Users/lap16932/personal/obsidian/Templates/project.md`:
```markdown
---
title: {{title}}
date: {{date}}
tags: [project]
status: active
related: []
---

## Goal

## Context

## Tasks
- [ ]

## Notes
```

- [ ] **Step 3: Create research template**

Create `/Users/lap16932/personal/obsidian/Templates/research.md`:
```markdown
---
title: {{title}}
date: {{date}}
tags: [research]
status: active
source:
related: []
---

## Summary

## Key Ideas

## Quotes

## My Thoughts
```

- [ ] **Step 4: Create idea template**

Create `/Users/lap16932/personal/obsidian/Templates/idea.md`:
```markdown
---
title: {{title}}
date: {{date}}
tags: [idea]
status: draft
related: []
---

## The Idea

## Why It Matters

## Next Step
```

- [ ] **Step 5: Create secret template**

Create `/Users/lap16932/personal/obsidian/Templates/secret.md`:
```markdown
---
title: {{title}}
date: {{date}}
service: {{service}}
tags: [secret]
status: active
---

## Credentials

## Endpoints

## Notes
```

---

## Task 3: Scaffold MCP Server Project

**Files:**
- Create: `.mcp/obsidian-server/package.json`
- Create: `.mcp/obsidian-server/tsconfig.json`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p /Users/lap16932/personal/obsidian/.mcp/obsidian-server/src
```

Create `/Users/lap16932/personal/obsidian/.mcp/obsidian-server/package.json`:
```json
{
  "name": "obsidian-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest run",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `/Users/lap16932/personal/obsidian/.mcp/obsidian-server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npm install
```

Expected: `node_modules/` created, `package-lock.json` created, no errors.

---

## Task 4: Implement templates.ts (TDD)

**Files:**
- Create: `.mcp/obsidian-server/src/templates.ts`
- Create: `.mcp/obsidian-server/src/templates.test.ts`

- [ ] **Step 1: Write failing tests**

Create `/Users/lap16932/personal/obsidian/.mcp/obsidian-server/src/templates.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderTemplate } from './templates.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

let tmpVault: string;

beforeEach(async () => {
  tmpVault = await fs.mkdtemp(path.join(os.tmpdir(), 'obsidian-test-'));
  process.env.VAULT_PATH = tmpVault;
  await fs.mkdir(path.join(tmpVault, 'Templates'));
  await fs.writeFile(
    path.join(tmpVault, 'Templates', 'meeting.md'),
    '---\ntitle: {{title}}\ndate: {{date}}\ntags: [meeting]\n---\n\n## Notes\n'
  );
});

afterEach(async () => {
  await fs.rm(tmpVault, { recursive: true, force: true });
});

describe('renderTemplate', () => {
  it('substitutes {{title}} and {{date}} variables', async () => {
    const result = await renderTemplate('meeting', { title: 'My Meeting', date: '2026-03-26' });
    expect(result).toContain('title: My Meeting');
    expect(result).toContain('date: 2026-03-26');
  });

  it('leaves unmatched variables as-is', async () => {
    const result = await renderTemplate('meeting', { title: 'Test' });
    expect(result).toContain('{{date}}');
  });

  it('throws if template file does not exist', async () => {
    await expect(renderTemplate('nonexistent' as any, {})).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npx vitest run src/templates.test.ts
```

Expected: FAIL — `Cannot find module './templates.js'`

- [ ] **Step 3: Implement templates.ts**

Create `/Users/lap16932/personal/obsidian/.mcp/obsidian-server/src/templates.ts`:
```typescript
import fs from 'fs/promises';
import path from 'path';

const TEMPLATES_FOLDER = 'Templates';

export type TemplateType = 'meeting' | 'project' | 'research' | 'idea' | 'secret';

export async function renderTemplate(
  type: TemplateType,
  variables: Record<string, string>
): Promise<string> {
  const vaultPath = process.env.VAULT_PATH ?? '/Users/lap16932/personal/obsidian';
  const templatePath = path.join(vaultPath, TEMPLATES_FOLDER, `${type}.md`);
  const template = await fs.readFile(templatePath, 'utf-8');
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? `{{${key}}}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npx vitest run src/templates.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/lap16932/personal/obsidian
git add .mcp/obsidian-server/src/templates.ts .mcp/obsidian-server/src/templates.test.ts
git commit -m "feat: add templates.ts with renderTemplate and tests"
```

---

## Task 5: Implement vault.ts (TDD)

**Files:**
- Create: `.mcp/obsidian-server/src/vault.ts`
- Create: `.mcp/obsidian-server/src/vault.test.ts`

- [ ] **Step 1: Write failing tests**

Create `/Users/lap16932/personal/obsidian/.mcp/obsidian-server/src/vault.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createNote, readNote, updateNote, deleteNote,
  searchNotes, listNotes, moveNote, getBacklinks,
  getDailyNote, createDailyNote, readSecret, writeSecret,
} from './vault.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

let tmpVault: string;

beforeEach(async () => {
  tmpVault = await fs.mkdtemp(path.join(os.tmpdir(), 'obsidian-vault-'));
  process.env.VAULT_PATH = tmpVault;
  for (const folder of ['Inbox', 'Projects', 'Resources', 'Ideas', 'Tasks', 'Archive', 'Secrets', 'Templates']) {
    await fs.mkdir(path.join(tmpVault, folder));
  }
});

afterEach(async () => {
  await fs.rm(tmpVault, { recursive: true, force: true });
});

describe('createNote', () => {
  it('creates a markdown file with frontmatter', async () => {
    const filePath = await createNote('My Note', 'Projects', 'Hello world', ['test']);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('title: My Note');
    expect(content).toContain('tags:');
    expect(content).toContain('Hello world');
  });

  it('slugifies the filename from the title', async () => {
    const filePath = await createNote('Hello World!', 'Ideas', '');
    expect(path.basename(filePath)).toBe('Hello-World.md');
  });
});

describe('readNote', () => {
  it('reads a note by path', async () => {
    const filePath = await createNote('Read Test', 'Projects', 'Content here', []);
    const note = await readNote(filePath);
    expect(note.frontmatter.title).toBe('Read Test');
    expect(note.content.trim()).toBe('Content here');
  });

  it('reads a note by title', async () => {
    await createNote('Find Me', 'Ideas', 'Body text', []);
    const note = await readNote('Find Me');
    expect(note.frontmatter.title).toBe('Find Me');
  });

  it('throws if note not found', async () => {
    await expect(readNote('Nonexistent')).rejects.toThrow('Note not found');
  });
});

describe('updateNote', () => {
  it('overwrites note content by default', async () => {
    const fp = await createNote('Update Me', 'Projects', 'Original', []);
    await updateNote(fp, 'Replaced');
    const note = await readNote(fp);
    expect(note.content.trim()).toBe('Replaced');
  });

  it('appends content in append mode', async () => {
    const fp = await createNote('Append Me', 'Projects', 'First', []);
    await updateNote(fp, 'Second', 'append');
    const note = await readNote(fp);
    expect(note.content).toContain('First');
    expect(note.content).toContain('Second');
  });
});

describe('deleteNote', () => {
  it('moves note to Archive, not deletes it', async () => {
    const fp = await createNote('Bye Note', 'Projects', 'Farewell', []);
    const archivePath = await deleteNote(fp);
    await expect(fs.access(fp)).rejects.toThrow();
    await expect(fs.access(archivePath)).resolves.not.toThrow();
    expect(archivePath).toContain('Archive');
  });
});

describe('searchNotes', () => {
  it('finds notes containing the query string', async () => {
    await createNote('Alpha', 'Projects', 'unique-search-term', []);
    await createNote('Beta', 'Ideas', 'something else', []);
    const results = await searchNotes('unique-search-term');
    expect(results).toHaveLength(1);
    expect(results[0].frontmatter.title).toBe('Alpha');
  });

  it('excludes Secrets/ by default', async () => {
    await writeSecret('Hidden Key', 'secret-content-xyz');
    const results = await searchNotes('secret-content-xyz');
    expect(results).toHaveLength(0);
  });

  it('includes Secrets/ when include_secrets is true', async () => {
    await writeSecret('Visible Key', 'secret-content-abc');
    const results = await searchNotes('secret-content-abc', undefined, undefined, true);
    expect(results).toHaveLength(1);
  });
});

describe('listNotes', () => {
  it('lists notes filtered by folder', async () => {
    await createNote('P1', 'Projects', '', ['project']);
    await createNote('I1', 'Ideas', '', ['idea']);
    const results = await listNotes('Projects');
    expect(results).toHaveLength(1);
    expect(results[0].frontmatter.title).toBe('P1');
  });

  it('lists notes filtered by tag', async () => {
    await createNote('Tagged', 'Projects', '', ['special']);
    await createNote('Untagged', 'Ideas', '', []);
    const results = await listNotes(undefined, 'special');
    expect(results).toHaveLength(1);
  });
});

describe('moveNote', () => {
  it('moves note to a different folder', async () => {
    const fp = await createNote('Move Me', 'Inbox', 'body', []);
    const newPath = await moveNote(fp, 'Projects');
    await expect(fs.access(fp)).rejects.toThrow();
    await expect(fs.access(newPath)).resolves.not.toThrow();
    expect(newPath).toContain('Projects');
  });
});

describe('getBacklinks', () => {
  it('finds notes that reference the given title via wikilinks', async () => {
    await createNote('Target', 'Projects', '', []);
    await createNote('Source', 'Ideas', 'See also [[Target]] for more', []);
    const backlinks = await getBacklinks('Target');
    expect(backlinks).toContain('Source');
  });

  it('returns empty array when no backlinks', async () => {
    await createNote('Lonely', 'Projects', '', []);
    const backlinks = await getBacklinks('Lonely');
    expect(backlinks).toHaveLength(0);
  });
});

describe('daily note', () => {
  it('returns null if daily note does not exist', async () => {
    const note = await getDailyNote('2099-01-01');
    expect(note).toBeNull();
  });

  it('creates a daily note in Inbox/', async () => {
    const fp = await createDailyNote('2026-03-26');
    expect(fp).toContain('Inbox');
    expect(fp).toContain('2026-03-26');
    const note = await readNote(fp);
    expect(note.frontmatter.tags).toContain('daily');
  });

  it('getDailyNote returns note after creation', async () => {
    await createDailyNote('2026-03-26');
    const note = await getDailyNote('2026-03-26');
    expect(note).not.toBeNull();
  });
});

describe('secrets', () => {
  it('writes and reads a secret', async () => {
    await writeSecret('My API Key', 'sk-1234', 'OpenAI');
    const note = await readSecret('My API Key');
    expect(note.content).toContain('sk-1234');
  });

  it('throws if secret not found', async () => {
    await expect(readSecret('Missing Secret')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npx vitest run src/vault.test.ts
```

Expected: FAIL — `Cannot find module './vault.js'`

- [ ] **Step 3: Implement vault.ts**

Create `/Users/lap16932/personal/obsidian/.mcp/obsidian-server/src/vault.ts`:
```typescript
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface NoteFrontmatter {
  title: string;
  date: string;
  tags: string[];
  status: 'active' | 'archived' | 'draft';
  related: string[];
  service?: string;
  source?: string;
}

export interface Note {
  path: string;
  frontmatter: NoteFrontmatter;
  content: string;
  raw: string;
}

function vaultRoot(): string {
  return process.env.VAULT_PATH ?? '/Users/lap16932/personal/obsidian';
}

function vaultPath(...parts: string[]): string {
  return path.join(vaultRoot(), ...parts);
}

function slugify(title: string): string {
  return title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
}

export async function createNote(
  title: string,
  folder: string,
  content: string,
  tags: string[] = [],
  extraFrontmatter: Partial<NoteFrontmatter> = {}
): Promise<string> {
  const filename = `${slugify(title)}.md`;
  const filePath = vaultPath(folder, filename);
  const frontmatter: NoteFrontmatter = {
    title,
    date: new Date().toISOString().split('T')[0],
    tags,
    status: 'active',
    related: [],
    ...extraFrontmatter,
  };
  const fileContent = matter.stringify(content, frontmatter as Record<string, unknown>);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, fileContent, 'utf-8');
  return filePath;
}

export async function readNote(titleOrPath: string): Promise<Note> {
  const filePath = titleOrPath.endsWith('.md')
    ? titleOrPath
    : await findNoteByTitle(titleOrPath);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = matter(raw);
  return {
    path: filePath,
    frontmatter: parsed.data as NoteFrontmatter,
    content: parsed.content,
    raw,
  };
}

export async function updateNote(
  titleOrPath: string,
  newContent: string,
  mode: 'overwrite' | 'append' = 'overwrite'
): Promise<string> {
  const note = await readNote(titleOrPath);
  const updatedContent =
    mode === 'append'
      ? note.content.trimEnd() + '\n\n' + newContent
      : newContent;
  const fileContent = matter.stringify(updatedContent, note.frontmatter as Record<string, unknown>);
  await fs.writeFile(note.path, fileContent, 'utf-8');
  return note.path;
}

export async function deleteNote(titleOrPath: string): Promise<string> {
  const note = await readNote(titleOrPath);
  const basename = path.basename(note.path, '.md');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archivePath = vaultPath('Archive', `${timestamp}-${basename}.md`);
  await fs.mkdir(path.dirname(archivePath), { recursive: true });
  await fs.rename(note.path, archivePath);
  return archivePath;
}

export async function searchNotes(
  query: string,
  folder?: string,
  tags?: string[],
  includeSecrets = false
): Promise<Note[]> {
  const notes = await getAllNotes(includeSecrets);
  const inFolder = folder
    ? notes.filter(n => n.path.startsWith(vaultPath(folder)))
    : notes;
  const withTags =
    tags && tags.length > 0
      ? inFolder.filter(n => tags.some(t => n.frontmatter.tags?.includes(t)))
      : inFolder;
  const q = query.toLowerCase();
  return withTags.filter(
    n =>
      n.raw.toLowerCase().includes(q) ||
      n.frontmatter.title?.toLowerCase().includes(q)
  );
}

export async function listNotes(
  folder?: string,
  tag?: string,
  status?: string
): Promise<Note[]> {
  const notes = await getAllNotes(false);
  let filtered = notes;
  if (folder) filtered = filtered.filter(n => n.path.startsWith(vaultPath(folder)));
  if (tag) filtered = filtered.filter(n => n.frontmatter.tags?.includes(tag));
  if (status) filtered = filtered.filter(n => n.frontmatter.status === status);
  return filtered;
}

export async function moveNote(titleOrPath: string, destinationFolder: string): Promise<string> {
  const note = await readNote(titleOrPath);
  const basename = path.basename(note.path);
  const newPath = vaultPath(destinationFolder, basename);
  await fs.mkdir(path.dirname(newPath), { recursive: true });
  await fs.rename(note.path, newPath);
  return newPath;
}

export async function getBacklinks(title: string): Promise<string[]> {
  const allNotes = await getAllNotes(false);
  const pattern = `[[${title}]]`;
  return allNotes
    .filter(n => n.raw.includes(pattern))
    .map(n => n.frontmatter.title ?? path.basename(n.path, '.md'));
}

export async function getDailyNote(date?: string): Promise<Note | null> {
  const dateStr = date ?? new Date().toISOString().split('T')[0];
  const filePath = vaultPath('Inbox', `${dateStr}.md`);
  try {
    return await readNote(filePath);
  } catch {
    return null;
  }
}

export async function createDailyNote(date?: string): Promise<string> {
  const dateStr = date ?? new Date().toISOString().split('T')[0];
  const filePath = vaultPath('Inbox', `${dateStr}.md`);
  const frontmatter: NoteFrontmatter = {
    title: `Daily Note - ${dateStr}`,
    date: dateStr,
    tags: ['daily'],
    status: 'active',
    related: [],
  };
  const content = matter.stringify(
    '\n## Notes\n\n## Action Items\n- [ ] \n',
    frontmatter as Record<string, unknown>
  );
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

export async function readSecret(title: string): Promise<Note> {
  const filePath = await findNoteInFolder(title, 'Secrets');
  return readNote(filePath);
}

export async function writeSecret(
  title: string,
  content: string,
  service?: string
): Promise<string> {
  return createNote(title, 'Secrets', content, ['secret'], service ? { service } : {});
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function getAllNotes(includeSecrets: boolean): Promise<Note[]> {
  const notes: Note[] = [];
  await walkDir(vaultRoot(), async (filePath) => {
    if (!filePath.endsWith('.md')) return;
    if (filePath.includes(path.join(vaultRoot(), '.mcp'))) return;
    if (!includeSecrets && filePath.startsWith(vaultPath('Secrets'))) return;
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(raw);
      notes.push({
        path: filePath,
        frontmatter: parsed.data as NoteFrontmatter,
        content: parsed.content,
        raw,
      });
    } catch {
      // skip unreadable files
    }
  });
  return notes;
}

async function walkDir(
  dir: string,
  callback: (filePath: string) => Promise<void>
): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    const fullPath = path.join(dir, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await walkDir(fullPath, callback);
    } else {
      await callback(fullPath);
    }
  }
}

async function findNoteByTitle(title: string): Promise<string> {
  const allNotes = await getAllNotes(true);
  const match = allNotes.find(
    n =>
      n.frontmatter.title === title ||
      path.basename(n.path, '.md').toLowerCase() === title.toLowerCase()
  );
  if (!match) throw new Error(`Note not found: ${title}`);
  return match.path;
}

async function findNoteInFolder(title: string, folder: string): Promise<string> {
  const folderPath = vaultPath(folder);
  let entries: string[];
  try {
    entries = await fs.readdir(folderPath);
  } catch {
    throw new Error(`Folder not found: ${folder}`);
  }
  const slug = slugify(title).toLowerCase();
  const match = entries.find(e => e.toLowerCase().replace('.md', '') === slug);
  if (!match) throw new Error(`Note not found in ${folder}: ${title}`);
  return path.join(folderPath, match);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npx vitest run src/vault.test.ts
```

Expected: PASS — all tests pass

- [ ] **Step 5: Commit**

```bash
cd /Users/lap16932/personal/obsidian
git add .mcp/obsidian-server/src/vault.ts .mcp/obsidian-server/src/vault.test.ts
git commit -m "feat: add vault.ts with full CRUD, search, backlinks, secrets and tests"
```

---

## Task 6: Implement index.ts (MCP Server)

**Files:**
- Create: `.mcp/obsidian-server/src/index.ts`

- [ ] **Step 1: Create index.ts**

Create `/Users/lap16932/personal/obsidian/.mcp/obsidian-server/src/index.ts`:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  createNote, readNote, updateNote, deleteNote,
  searchNotes, listNotes, moveNote, getBacklinks,
  getDailyNote, createDailyNote, readSecret, writeSecret,
} from './vault.js';
import { renderTemplate, type TemplateType } from './templates.js';

const server = new Server(
  { name: 'obsidian', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'create_note',
      description: 'Create a new note in the vault. Use template param for structured notes.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Note title' },
          folder: {
            type: 'string',
            description: 'Destination folder: Inbox, Projects, Resources, Ideas, Tasks',
          },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the note' },
          content: { type: 'string', description: 'Note body content' },
          template: {
            type: 'string',
            enum: ['meeting', 'project', 'research', 'idea', 'secret'],
            description: 'Use a template instead of raw content',
          },
        },
        required: ['title', 'folder'],
      },
    },
    {
      name: 'read_note',
      description: 'Read a note by title or file path.',
      inputSchema: {
        type: 'object',
        properties: {
          title_or_path: { type: 'string', description: 'Note title or absolute file path' },
        },
        required: ['title_or_path'],
      },
    },
    {
      name: 'update_note',
      description: 'Update an existing note. Mode "append" adds to end; "overwrite" replaces body.',
      inputSchema: {
        type: 'object',
        properties: {
          title_or_path: { type: 'string' },
          content: { type: 'string', description: 'New content' },
          mode: { type: 'string', enum: ['overwrite', 'append'], default: 'overwrite' },
        },
        required: ['title_or_path', 'content'],
      },
    },
    {
      name: 'delete_note',
      description: 'Move a note to Archive/ (never permanently deleted).',
      inputSchema: {
        type: 'object',
        properties: {
          title_or_path: { type: 'string' },
        },
        required: ['title_or_path'],
      },
    },
    {
      name: 'search_notes',
      description: 'Full-text search across vault. Excludes Secrets/ by default.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          folder: { type: 'string', description: 'Limit search to folder' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
          include_secrets: { type: 'boolean', default: false },
        },
        required: ['query'],
      },
    },
    {
      name: 'list_notes',
      description: 'List notes, optionally filtered by folder, tag, or status.',
      inputSchema: {
        type: 'object',
        properties: {
          folder: { type: 'string' },
          tag: { type: 'string' },
          status: { type: 'string', enum: ['active', 'archived', 'draft'] },
        },
      },
    },
    {
      name: 'move_note',
      description: 'Move a note to a different folder.',
      inputSchema: {
        type: 'object',
        properties: {
          title_or_path: { type: 'string' },
          destination: {
            type: 'string',
            description: 'Destination folder: Inbox, Projects, Resources, Ideas, Tasks, Archive',
          },
        },
        required: ['title_or_path', 'destination'],
      },
    },
    {
      name: 'get_backlinks',
      description: 'Find all notes that link to the given note title via [[wikilinks]].',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Note title to find backlinks for' },
        },
        required: ['title'],
      },
    },
    {
      name: 'daily_note',
      description: 'Create or fetch the daily note for today (or a given date) in Inbox/.',
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date in YYYY-MM-DD format (default: today)' },
        },
      },
    },
    {
      name: 'read_secret',
      description: 'Read a note from Secrets/ by title. Always explicit — never in search results.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Secret note title' },
        },
        required: ['title'],
      },
    },
    {
      name: 'write_secret',
      description: 'Create or update a note in Secrets/.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          service: { type: 'string', description: 'Service name (e.g. OpenAI, AWS)' },
        },
        required: ['title', 'content'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_note': {
        const { title, folder, tags = [], content, template } = args as {
          title: string; folder: string; tags?: string[]; content?: string; template?: TemplateType;
        };
        let body = content ?? '';
        if (template) {
          body = await renderTemplate(template, {
            title,
            date: new Date().toISOString().split('T')[0],
            service: '',
          });
          // strip frontmatter from template — createNote adds its own
          const parsed = body.split('---');
          body = parsed.length >= 3 ? parsed.slice(2).join('---').trim() : body;
        }
        const filePath = await createNote(title, folder, body, tags);
        return { content: [{ type: 'text', text: `Created: ${filePath}` }] };
      }

      case 'read_note': {
        const { title_or_path } = args as { title_or_path: string };
        const note = await readNote(title_or_path);
        return { content: [{ type: 'text', text: note.raw }] };
      }

      case 'update_note': {
        const { title_or_path, content, mode = 'overwrite' } = args as {
          title_or_path: string; content: string; mode?: 'overwrite' | 'append';
        };
        const filePath = await updateNote(title_or_path, content, mode);
        return { content: [{ type: 'text', text: `Updated: ${filePath}` }] };
      }

      case 'delete_note': {
        const { title_or_path } = args as { title_or_path: string };
        const archivePath = await deleteNote(title_or_path);
        return { content: [{ type: 'text', text: `Moved to archive: ${archivePath}` }] };
      }

      case 'search_notes': {
        const { query, folder, tags, include_secrets = false } = args as {
          query: string; folder?: string; tags?: string[]; include_secrets?: boolean;
        };
        const notes = await searchNotes(query, folder, tags, include_secrets);
        const summary = notes.map(n => `- ${n.frontmatter.title} (${n.path})`).join('\n');
        return { content: [{ type: 'text', text: summary || 'No notes found.' }] };
      }

      case 'list_notes': {
        const { folder, tag, status } = args as {
          folder?: string; tag?: string; status?: string;
        };
        const notes = await listNotes(folder, tag, status);
        const summary = notes.map(n => `- ${n.frontmatter.title} [${n.frontmatter.tags?.join(', ')}] (${n.frontmatter.status})`).join('\n');
        return { content: [{ type: 'text', text: summary || 'No notes found.' }] };
      }

      case 'move_note': {
        const { title_or_path, destination } = args as { title_or_path: string; destination: string };
        const newPath = await moveNote(title_or_path, destination);
        return { content: [{ type: 'text', text: `Moved to: ${newPath}` }] };
      }

      case 'get_backlinks': {
        const { title } = args as { title: string };
        const backlinks = await getBacklinks(title);
        return {
          content: [{
            type: 'text',
            text: backlinks.length > 0
              ? `Notes linking to "${title}":\n${backlinks.map(b => `- ${b}`).join('\n')}`
              : `No backlinks found for "${title}".`,
          }],
        };
      }

      case 'daily_note': {
        const { date } = args as { date?: string };
        let note = await getDailyNote(date);
        if (!note) {
          const fp = await createDailyNote(date);
          note = await readNote(fp);
        }
        return { content: [{ type: 'text', text: note.raw }] };
      }

      case 'read_secret': {
        const { title } = args as { title: string };
        const note = await readSecret(title);
        return { content: [{ type: 'text', text: note.raw }] };
      }

      case 'write_secret': {
        const { title, content, service } = args as { title: string; content: string; service?: string };
        const filePath = await writeSecret(title, content, service);
        return { content: [{ type: 'text', text: `Secret saved: ${filePath}` }] };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Build the server**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npm run build
```

Expected: `dist/` directory created with `index.js`, `vault.js`, `templates.js` — no TypeScript errors.

If there are errors, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
cd /Users/lap16932/personal/obsidian
git add .mcp/obsidian-server/src/index.ts
git commit -m "feat: add MCP server index.ts wiring all 11 vault tools"
```

---

## Task 7: Register MCP Server with Claude Code

**Files:**
- Modify: `.claude/settings.local.json`

- [ ] **Step 1: Update settings.local.json**

Read the current contents first:
```bash
cat /Users/lap16932/personal/obsidian/.claude/settings.local.json
```

Then update it to add the MCP server. The file should look like:
```json
{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/Users/lap16932/personal/obsidian/.mcp/obsidian-server/dist/index.js"],
      "env": {
        "VAULT_PATH": "/Users/lap16932/personal/obsidian"
      }
    }
  }
}
```

Preserve any existing keys in the file — only add the `mcpServers` block.

- [ ] **Step 2: Restart Claude Code session**

Close and reopen Claude Code in this directory, or run:
```
/mcp
```
Expected: `obsidian` server listed as connected with 11 tools available.

- [ ] **Step 3: Commit**

```bash
cd /Users/lap16932/personal/obsidian
git add .claude/settings.local.json
git commit -m "feat: register obsidian MCP server in settings.local.json"
```

---

## Task 8: Run All Tests + End-to-End Verification

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/lap16932/personal/obsidian/.mcp/obsidian-server
npm test
```

Expected: All tests pass — no failures.

- [ ] **Step 2: End-to-end smoke test from Claude Code CLI**

In a new Claude Code session in `/Users/lap16932/personal/obsidian`, ask Claude:

```
Create a project note called "Test Project" in Projects/ with tags [project, test]
```
Expected: File created at `Projects/Test-Project.md` with correct frontmatter.

```
Search for notes tagged with "project"
```
Expected: "Test Project" appears in results.

```
Append an action item "- [ ] Finish the MCP server" to Test Project
```
Expected: Note updated, action item added at end.

```
Create today's daily note
```
Expected: `Inbox/2026-03-26.md` created (or today's date).

```
Store a secret called "OpenAI Key" with content "sk-test-abc123" for service OpenAI
```
Expected: `Secrets/OpenAI-Key.md` created.

```
Search for "sk-test-abc123"
```
Expected: No results (secret excluded from search).

```
Read secret OpenAI Key
```
Expected: Note content shown including `sk-test-abc123`.

```
Delete Test Project
```
Expected: File moved to `Archive/`, not deleted.

```
List all notes in Archive/
```
Expected: Test Project appears in archive listing.

- [ ] **Step 3: Final commit**

```bash
cd /Users/lap16932/personal/obsidian
git add .
git commit -m "feat: complete obsidian MCP agent - vault structure, templates, server, tests"
```
