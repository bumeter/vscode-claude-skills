// Answers in the shape `bum rpc` 1.2.0 sends; generic skill names only.
import type { Page, SkillReport, SkillRow } from '../src/types';

export function row(name: string, over: { entry?: Partial<SkillRow['entry']> } & Partial<Omit<SkillRow, 'entry'>> = {}): SkillRow {
  const { entry, ...rest } = over;
  return {
    entry: { name, tool: 'claude_code', description: `What ${name} does`, source: { kind: 'personal' }, state: 'enabled', path: `/home/u/.claude/skills/${name}`,
      symlink: false, installed_at: '2026-09-20T16:00:52Z', always_on_tokens: 60, on_invoke_tokens: 3000, estimated: true, managed: true, ...entry },
    uses: 0, projects: 0, tokens: 0, avg_tokens: null, last_used: null, unused_30d: false, usage_known: true, ...rest,
  };
}

export const REPORT: SkillReport = {
  rows: [
    row('brainstorming', { uses: 42, projects: 3, tokens: 50_400, avg_tokens: 1_200, last_used: '2026-10-23T09:00:00Z' }),
    row('code-review', { uses: 17, projects: 2, avg_tokens: 3_400, entry: { name: 'tools:code-review', source: { kind: 'plugin', plugin: 'tools' } } }),
    row('pdf', { entry: { state: 'disabled' }, unused_30d: true }),
    row('docs', { uses: 1, entry: { source: { kind: 'synced' }, managed: false } }),
    row('planner', { uses: 5, entry: { tool: 'kiro', path: '/home/u/.kiro/skills/planner' } }),
  ],
  commands: [row('old-command', { entry: { source: { kind: 'command' }, managed: false, path: null } })],
  total_always_on: 300, unused: ['pdf'], unused_always_on: 60, warnings: [],
};

export const PAGE: Page = {
  hits: [
    { id: 'owner/skills/pdf-tools', source: 'owner/skills', skill_id: 'pdf-tools', name: 'pdf-tools', installs: 12_400 },
    { id: 'owner/skills/pdf', source: 'owner/skills', skill_id: 'pdf', name: 'pdf', installs: 2_000 },
    { id: 'other/repo/docx', source: 'other/repo', skill_id: 'docx', name: 'docx', installs: 880 },
  ],
  has_more: true, total: 40,
};
