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
