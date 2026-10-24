import { describe, expect, it } from 'vitest';
import { actionsFor, runOp } from '../src/ops';
import type { OpUi } from '../src/ops';
import type { SkillRow } from '../src/types';

const row = (over: Partial<SkillRow['entry']> = {}): SkillRow => ({
  entry: { name: 'brainstorming', tool: 'claude_code', description: 'Turn ideas into designs', source: { kind: 'personal' }, state: 'enabled', path: '/home/u/.claude/skills/brainstorming',
    symlink: false, installed_at: null, always_on_tokens: 57, on_invoke_tokens: 4988, estimated: true, managed: true, ...over },
  uses: 3, projects: 1, tokens: 1000, avg_tokens: 333, last_used: null, unused_30d: false, usage_known: true,
});

describe('actionsFor', () => {
  it('a personal skill: turn off or remove, turn on or remove', () => {
    expect(actionsFor(row())).toEqual([{ op: 'disable', target: 'brainstorming', kind: 'toggle' }, { op: 'uninstall', target: 'brainstorming', kind: 'uninstall' }]);
    expect(actionsFor(row({ state: 'disabled' }))[0]).toEqual({ op: 'enable', target: 'brainstorming', kind: 'toggle' });
  });
  it('a plugin skill toggles its plugin and cannot be removed here', () => {
    expect(actionsFor(row({ name: 'tools:review', source: { kind: 'plugin', plugin: 'tools' } }))).toEqual([{ op: 'plugin_disable', target: 'tools', kind: 'toggle' }]);
    expect(actionsFor(row({ source: { kind: 'plugin', plugin: 'tools' }, state: 'disabled' }))).toEqual([{ op: 'plugin_enable', target: 'tools', kind: 'toggle' }]);
  });
  it('synced and log-only skills are read-only', () => {
    expect(actionsFor(row({ source: { kind: 'synced' }, managed: false }))).toEqual([]);
  });
});

function fakes(planError?: string, confirm = true) {
  const calls: [string, unknown][] = [];
  const rpc = {
    call: async <T>(m: string, p?: unknown): Promise<T> => {
      calls.push([m, p]);
      if (m === 'skills:plan') { if (planError) throw new Error(planError); return { id: 'plan-1', description: 'Move ~/.claude/skills/pdf to ~/.claude/skills-disabled/pdf' } as T; }
      if (m === 'skills:apply') return { id: 'journal-1', op: 'disable', description: 'd' } as T;
      return true as T;
    },
  };
  const seen: { confirm?: [string, string]; done?: string; error?: string; undo?: () => Promise<void> } = {};
  const ui: OpUi = {
    confirm: async (detail, button) => { seen.confirm = [detail, button]; return confirm; },
    done: (m, undo) => { seen.done = m; seen.undo = undo; },
    error: (m) => { seen.error = m; },
  };
  return { rpc, ui, calls, seen };
}

describe('runOp', () => {
  const req = { op: 'disable', targets: ['pdf'], tool: 'claude_code' as const };

  it('a plan the backend refuses is an error, nothing is asked or applied', async () => {
    const f = fakes('pdf is already disabled');
    expect(await runOp(f.rpc, req, f.ui, 'en')).toBe(false);
    expect(f.seen.error).toContain('already disabled');
    expect(f.seen.confirm).toBeUndefined();
    expect(f.calls.map((c) => c[0])).toEqual(['skills:plan']);
  });

  it('cancelled: not applied', async () => {
    const f = fakes(undefined, false);
    expect(await runOp(f.rpc, req, f.ui, 'en')).toBe(false);
    expect(f.seen.confirm).toEqual(['Move ~/.claude/skills/pdf to ~/.claude/skills-disabled/pdf', 'Disable']);
    expect(f.calls.map((c) => c[0])).toEqual(['skills:plan']);
  });

  it('confirmed: applies that plan, then offers to undo the journal entry', async () => {
    const f = fakes();
    expect(await runOp(f.rpc, req, f.ui, 'en')).toBe(true);
    expect(f.calls[0]).toEqual(['skills:plan', req]);
    expect(f.calls[1]).toEqual(['skills:apply', { id: 'plan-1' }]);
    expect(f.seen.done).toContain('Move ~/.claude/skills/pdf');
    await f.seen.undo!();
    expect(f.calls[2]).toEqual(['skills:undo', { id: 'journal-1', tool: 'claude_code' }]);
  });

  it('the confirm button names the operation', async () => {
    for (const [op, label] of [['enable', 'Enable'], ['uninstall', 'Remove'], ['install_market', 'Install'], ['plugin_disable', 'Disable']]) {
      const f = fakes(undefined, false);
      await runOp(f.rpc, { op }, f.ui, 'en');
      expect(f.seen.confirm![1]).toBe(label);
    }
  });
});
