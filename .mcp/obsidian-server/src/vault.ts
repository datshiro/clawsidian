import fs from 'fs/promises';
import { Dirent } from 'fs';
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

export type ResponseMode = 'full' | 'content' | 'summary';

export interface FilterOptions {
  mode: ResponseMode;
  fields?: string[];
}

export function filterNote(note: Note, mode: ResponseMode, fields?: string[]): Partial<Note> {
  const result: Partial<Note> = {};

  if (fields && fields.length > 0) {
    if (mode === 'content') {
      result.content = note.content;
    }
    result.frontmatter = {} as NoteFrontmatter;
    for (const field of fields) {
      if (field in note.frontmatter) {
        (result.frontmatter as Record<string, unknown>)[field] = note.frontmatter[field as keyof NoteFrontmatter];
      }
    }
  } else {
    if (mode === 'content' || mode === 'full') {
      result.content = note.content;
    }
    if (mode === 'full') {
      result.frontmatter = note.frontmatter;
    } else if (mode === 'summary') {
      const fm = note.frontmatter;
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

function vaultRoot(): string {
  return process.env.VAULT_PATH ?? '/Users/lap16932/personal/obsidian';
}

function vaultPath(...parts: string[]): string {
  return path.join(vaultRoot(), ...parts);
}

function slugify(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-');
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
  const fileContent = matter.stringify(content, frontmatter as unknown as Record<string, unknown>);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
    throw new Error(`Note already exists: ${filePath}. Use updateNote to modify it.`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  await fs.writeFile(filePath, fileContent, 'utf-8');
  return filePath;
}

export async function readNote(titleOrPath: string): Promise<Note> {
  const filePath = titleOrPath.endsWith('.md')
    ? titleOrPath
    : await findNoteByTitle(titleOrPath);
  if (!filePath.startsWith(vaultRoot())) {
    throw new Error(`Access denied: path is outside vault: ${filePath}`);
  }
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
  const fileContent = matter.stringify(updatedContent, note.frontmatter as unknown as Record<string, unknown>);
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
  return allNotes
    .filter(n => n.raw.includes(`[[${title}]]`) || n.raw.includes(`[[${title}|`))
    .map(n => n.frontmatter.title ?? path.basename(n.path, '.md'));
}

export async function getDailyNote(date?: string): Promise<Note | null> {
  const dateStr = date ?? new Date().toISOString().split('T')[0];
  const filePath = vaultPath('Inbox', `${dateStr}.md`);
  try {
    return await readNote(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
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
    frontmatter as unknown as Record<string, unknown>
  );
  await fs.mkdir(path.dirname(filePath), { recursive: true });
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
  try {
    // If the secret already exists, update it
    const existing = await findNoteInFolder(title, 'Secrets');
    await updateNote(existing, content, 'overwrite');
    return existing;
  } catch {
    // Note doesn't exist — create it
    return createNote(title, 'Secrets', content, ['secret'], service ? { service } : {});
  }
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
    } catch (err) {
      console.error(`[obsidian-mcp] skipped unreadable note: ${filePath}`, err);
    }
  });
  return notes;
}

async function walkDir(
  dir: string,
  callback: (filePath: string) => Promise<void>
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith('.')) return;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDir(fullPath, callback);
      } else {
        await callback(fullPath);
      }
    })
  );
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
  const match = entries.find(e => e.toLowerCase().replace(/\.md$/, '') === slug);
  if (!match) throw new Error(`Note not found in ${folder}: ${title}`);
  return path.join(folderPath, match);
}
