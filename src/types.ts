// What `bum rpc` answers for the skills methods (bum 1.2.0), as the extension and the webview read it.

export type Tool = 'claude_code' | 'kiro';

export type SkillSource = { kind: 'personal' } | { kind: 'plugin'; plugin: string } | { kind: 'synced' } | { kind: 'command' };

export interface SkillEntry {
  name: string;
  tool: Tool;
  description: string;
  source: SkillSource;
  state: 'enabled' | 'disabled';
  path: string | null;
  symlink: boolean;
  installed_at: string | null;
  /** Tokens the skill costs in every session (its name and description). */
  always_on_tokens: number | null;
  /** Tokens it costs when used (the whole SKILL.md). */
  on_invoke_tokens: number | null;
  estimated: boolean;
  /** Bumeter may turn it on/off or remove it (not synced from claude.ai, not a log-only command). */
  managed: boolean;
}

export interface SkillRow {
  entry: SkillEntry;
  uses: number;
  projects: number;
  tokens: number;
  avg_tokens: number | null;
  last_used: string | null;
  unused_30d: boolean;
  usage_known: boolean;
}

/** `skills:list`. `commands` are skills only still seen in the log; the extension does not show them. */
export interface SkillReport {
  rows: SkillRow[];
  commands: SkillRow[];
  total_always_on: number;
  unused: string[];
  unused_always_on: number;
  warnings: string[];
}

/** A skill on skills.sh (`skills:search`, `skills:top`). No description: skills.sh does not send one. */
export interface Hit { id: string; source: string; skill_id: string; name: string; installs: number }
export interface Page { hits: Hit[]; has_more: boolean; total: number }

/** `skills:count`: personal skills only (plugins need the slow `claude` CLI). */
export interface Counts { claude_code: number; kiro: number; total: number }

/** `skills:plan`. */
export interface OpRequest { op: string; targets?: string[]; source?: string; tool?: Tool; skill?: string }
export interface Plan { id: string; description: string }
export interface JournalEntry { id: string; op: string; description: string }
