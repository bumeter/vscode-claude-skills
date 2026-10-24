import { describe, expect, it } from 'vitest';
import { buttonView, SkillsButton } from '../src/button';
import { statusItems } from './vscode';

describe('buttonView', () => {
  it('the number of skills, and each tool in the tooltip', () => {
    const v = buttonView({ claude_code: 15, kiro: 3, total: 18 }, null, 'en');
    expect(v.text).toBe('$(book) 18 skills');
    expect(v.level).toBe('normal');
    expect(v.tooltip).toContain('Claude Code 15 · Kiro 3');
    expect(v.tooltip).toContain('command:claudeSkills.open');
    expect(v.tooltip).toContain('command:claudeSkills.refresh');
  });
  it('one skill, and Vietnamese', () => {
    expect(buttonView({ claude_code: 1, kiro: 0, total: 1 }, null, 'en').text).toBe('$(book) 1 skill');
    expect(buttonView({ claude_code: 15, kiro: 3, total: 18 }, null, 'vi').text).toBe('$(book) 18 skill');
  });
  it('an error turns it red and says why; no answer yet spins', () => {
    const e = buttonView(null, 'bum exited', 'en');
    expect(e.text).toBe('$(book) $(error)');
    expect(e.level).toBe('error');
    expect(e.tooltip).toContain('bum exited');
    expect(buttonView(null, null, 'en').text).toBe('$(sync~spin) skills');
  });
});

describe('SkillsButton', () => {
  it('asks skills:count and shows it', async () => {
    const before = statusItems.length;
    const rpc = { call: async (m: string) => (m === 'skills:count' ? { claude_code: 2, kiro: 1, total: 3 } : null) };
    const b = new SkillsButton(rpc as never, 'en', 'claudeSkills.open', 1e9);
    await b.refresh();
    expect(statusItems[before].text).toBe('$(book) 3 skills');
    expect(statusItems[before].shown).toBe(true);
    b.dispose();
  });
  it('shows the error when bum fails', async () => {
    const before = statusItems.length;
    const b = new SkillsButton({ call: async () => { throw new Error('boom'); } } as never, 'en', 'x', 1e9);
    await b.refresh();
    expect(statusItems[before].text).toBe('$(book) $(error)');
    b.dispose();
  });
});
