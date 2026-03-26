import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createNote, readNote, updateNote, deleteNote,
  searchNotes, listNotes, moveNote, getBacklinks,
  getDailyNote, createDailyNote, readSecret, writeSecret,
  filterNote,
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

function createTestNote() {
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
