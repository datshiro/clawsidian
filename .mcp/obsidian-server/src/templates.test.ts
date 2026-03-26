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
