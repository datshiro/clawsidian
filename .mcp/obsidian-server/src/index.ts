#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import matter from 'gray-matter';
import {
  createNote, readNote, updateNote, deleteNote,
  searchNotes, listNotes, moveNote, getBacklinks,
  getDailyNote, createDailyNote, readSecret, writeSecret,
  filterNote,
} from './vault.js';
import { renderTemplate, type TemplateType } from './templates.js';
import type { ResponseMode } from './vault.js';

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

function requireArgs<T extends Record<string, unknown>>(
  args: unknown,
  required: (keyof T)[],
  toolName: string
): T {
  const a = args as T;
  for (const key of required) {
    if (a[key] === undefined || a[key] === null || a[key] === '') {
      throw new Error(`Missing required argument "${String(key)}" for tool "${toolName}"`);
    }
  }
  return a;
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_note': {
        const { title, folder, tags = [], content, template } = requireArgs<{
          title: string; folder: string; tags?: string[]; content?: string; template?: TemplateType;
        }>(args, ['title', 'folder'], 'create_note');
        let body = content ?? '';
        if (template) {
          const rendered = await renderTemplate(template, {
            title,
            date: new Date().toISOString().split('T')[0],
            service: '',
          });
          // strip frontmatter from template — createNote adds its own
          body = matter(rendered).content.trim();
        }
        const filePath = await createNote(title, folder, body, tags);
        return { content: [{ type: 'text', text: `Created: ${filePath}` }] };
      }

      case 'read_note': {
        const { title_or_path, mode = 'full', fields } = requireArgs<{
          title_or_path: string; mode?: ResponseMode; fields?: string[];
        }>(args, ['title_or_path'], 'read_note');
  const note = await readNote(title_or_path);
  const filtered = filterNote(note, mode, fields);
  const output = mode === 'full' ? note.raw : JSON.stringify(filtered, null, 2);
  return { content: [{ type: 'text', text: output }] };
}

      case 'update_note': {
        const { title_or_path, content, mode = 'overwrite' } = requireArgs<{
          title_or_path: string; content: string; mode?: 'overwrite' | 'append';
        }>(args, ['title_or_path', 'content'], 'update_note');
        const filePath = await updateNote(title_or_path, content, mode);
        return { content: [{ type: 'text', text: `Updated: ${filePath}` }] };
      }

      case 'delete_note': {
        const { title_or_path } = requireArgs<{ title_or_path: string }>(args, ['title_or_path'], 'delete_note');
        const archivePath = await deleteNote(title_or_path);
        return { content: [{ type: 'text', text: `Moved to archive: ${archivePath}` }] };
      }

      case 'search_notes': {
  const { query, folder, tags, include_secrets = false, mode = 'full', fields } = (args ?? {}) as {
    query: string; folder?: string; tags?: string[]; include_secrets?: boolean;
    mode?: ResponseMode; fields?: string[];
  };
  const notes = await searchNotes(query, folder, tags, include_secrets);
  const filtered = notes.map(n => filterNote(n, mode, fields));
  return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
}

      case 'list_notes': {
  const { folder, tag, status, mode = 'summary', fields } = (args ?? {}) as {
    folder?: string; tag?: string; status?: string;
    mode?: ResponseMode; fields?: string[];
  };
  const notes = await listNotes(folder, tag, status);
  const filtered = notes.map(n => filterNote(n, mode, fields));
  return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
}

      case 'move_note': {
        const { title_or_path, destination } = requireArgs<{ title_or_path: string; destination: string }>(
          args, ['title_or_path', 'destination'], 'move_note'
        );
        const newPath = await moveNote(title_or_path, destination);
        return { content: [{ type: 'text', text: `Moved to: ${newPath}` }] };
      }

      case 'get_backlinks': {
        const { title } = requireArgs<{ title: string }>(args, ['title'], 'get_backlinks');
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
        const { title } = requireArgs<{ title: string }>(args, ['title'], 'read_secret');
        const note = await readSecret(title);
        return { content: [{ type: 'text', text: note.raw }] };
      }

      case 'write_secret': {
        const { title, content, service } = requireArgs<{ title: string; content: string; service?: string }>(
          args, ['title', 'content'], 'write_secret'
        );
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
