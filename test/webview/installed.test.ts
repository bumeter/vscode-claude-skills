import { beforeEach, describe, expect, it } from 'vitest';
import { filterRows, mountInstalled } from '../../webview/installed';
import { setLang } from '../../webview/strings';
import { REPORT, row } from '../fixtures';
import { fakeBridge, flush } from './fake';

const NOW = Date.parse('2026-10-24T12:00:00Z');
const names = (root: HTMLElement) => [...root.querySelectorAll('.card .card-name')].map((e) => e.textContent);
const card = (root: HTMLElement, key: string) => root.querySelector<HTMLElement>(`.card[data-key="${key}"]`)!;

async function mount(report = REPORT) {
  const root = document.createElement('main');
  document.body.replaceChildren(root);
  const f = fakeBridge({ 'skills:list': report });
  let installs = 0;
  const v = mountInstalled(root, { bridge: f.bridge, onInstall: () => installs++, now: () => NOW });
  await v.reload();
  return { root, f, v, installs: () => installs };
}

beforeEach(() => setLang('en'));

describe('filterRows', () => {
  it('by tool, state, unused and text', () => {
    const rows = REPORT.rows;
    expect(filterRows(rows, 'claude_code', 'all').map((r) => r.entry.name)).toEqual(['brainstorming', 'tools:code-review', 'pdf', 'docs']);
    expect(filterRows(rows, 'kiro', 'all').map((r) => r.entry.name)).toEqual(['planner']);
    expect(filterRows(rows, 'claude_code', 'disabled').map((r) => r.entry.name)).toEqual(['pdf']);
    expect(filterRows(rows, 'claude_code', 'unused').map((r) => r.entry.name)).toEqual(['pdf']);
    expect(filterRows(rows, 'claude_code', 'all', 'WHAT DOCS').map((r) => r.entry.name)).toEqual(['docs']);
  });
});

describe('installed cards', () => {
  it('asks for personal skills first, then with plugins; never shows log-only commands', async () => {
    const { root, f } = await mount();
    expect(f.calls).toEqual([['skills:list', { plugins: false }], ['skills:list', {}]]);
    expect(names(root)).toEqual(['brainstorming', 'tools:code-review', 'docs', 'pdf']);
    expect(root.textContent).not.toContain('old-command');
  });

  it('tabs per tool with counts; Kiro shows its own', async () => {
    const { root } = await mount();
    const tabs = [...root.querySelectorAll('[data-tool]')].map((b) => b.textContent);
    expect(tabs).toEqual(['Claude Code 4', 'Kiro 1']);
    root.querySelector<HTMLButtonElement>('[data-tool="kiro"]')!.click();
    expect(names(root)).toEqual(['planner']);
  });

  it('a card: name, source, description, numbers; disabled is dimmed; the footer', async () => {
    const { root } = await mount();
    const brain = card(root, 'claude_code:brainstorming');
    expect(brain.querySelector('.dot')!.textContent).toBe('●');
    expect(brain.querySelector('.card-source')!.textContent).toBe('Personal');
    expect(brain.querySelector('.card-desc')!.textContent).toBe('What brainstorming does');
    expect(brain.querySelector('.card-stats')!.textContent).toBe('42 uses · 3 projects · yesterday');
    expect(brain.querySelector('.card-always')!.textContent).toBe('Always-on ~60 tokens');
    expect(card(root, 'claude_code:tools:code-review').querySelector('.card-source')!.textContent).toBe('Plugin · tools');
    expect(card(root, 'claude_code:pdf').classList.contains('dim')).toBe(true);
    expect(card(root, 'claude_code:pdf').querySelector('.card-stats')!.textContent).toBe('0 uses · 0 projects · Unused for 30 days');
    expect(card(root, 'claude_code:docs').querySelector('.card-stats')!.textContent).toBe('1 use · 0 projects · never');
    expect(root.querySelector('footer span')!.textContent).toBe('4 skills · 1 disabled · 1 unused for 30 days');
  });

  it('sorts by the chosen key; clicking a card opens its details', async () => {
    const { root } = await mount();
    const sort = root.querySelector<HTMLSelectElement>('#sort')!;
    sort.value = 'name';
    sort.dispatchEvent(new Event('change'));
    expect(names(root)).toEqual(['brainstorming', 'docs', 'pdf', 'tools:code-review']);
    const brain = card(root, 'claude_code:brainstorming');
    const more = brain.querySelector<HTMLElement>('.card-more')!;
    expect(more.hidden).toBe(true);
    brain.click();
    expect(more.hidden).toBe(false);
    expect(more.textContent).toContain('1.2K');
    expect(more.textContent).toContain('/home/u/.claude/skills/brainstorming');
    brain.querySelector<HTMLButtonElement>('[data-action="toggle"]')!.click();
    expect(more.hidden).toBe(false);
  });

  it('read-only skills have no on/off; the toggle and remove send ops with the right target', async () => {
    const { root, f } = await mount();
    expect(card(root, 'claude_code:docs').querySelector('[data-action="toggle"]')).toBeNull();
    expect(card(root, 'claude_code:docs').textContent).toContain('Read-only');
    card(root, 'claude_code:pdf').querySelector<HTMLButtonElement>('[data-action="toggle"]')!.click();
    card(root, 'claude_code:tools:code-review').querySelector<HTMLButtonElement>('[data-action="toggle"]')!.click();
    card(root, 'claude_code:brainstorming').querySelector<HTMLButtonElement>('[data-action="uninstall"]')!.click();
    await flush();
    expect(f.ops).toEqual([
      { op: 'enable', targets: ['pdf'], tool: 'claude_code' },
      { op: 'plugin_disable', targets: ['tools'], tool: 'claude_code' },
      { op: 'uninstall', targets: ['brainstorming'], tool: 'claude_code' },
    ]);
    card(root, 'claude_code:brainstorming').querySelector<HTMLButtonElement>('[data-action="file"]')!.click();
    expect(f.opened).toEqual([['file', '/home/u/.claude/skills/brainstorming']]);
  });

  it('no usage numbers: dashes and a note; warnings show; empty offers to install', async () => {
    const noUsage = { ...REPORT, rows: [row('alpha', { usage_known: false })], warnings: ['`claude` not found: plugin skills are not listed'] };
    const { root } = await mount(noUsage);
    expect(root.querySelector('.card-stats')).toBeNull();
    expect(root.textContent).toContain('No usage numbers yet');
    expect(root.querySelector('.notice.warning')!.textContent).toContain('`claude` not found');
    const empty = await mount({ ...REPORT, rows: [] });
    empty.root.querySelector<HTMLButtonElement>('.empty button')!.click();
    expect(empty.installs()).toBe(1);
  });

  it('an error with nothing loaded offers to retry', async () => {
    const root = document.createElement('main');
    const f = fakeBridge({ 'skills:list': new Error('bum exited') });
    const v = mountInstalled(root, { bridge: f.bridge, onInstall: () => undefined });
    await v.reload();
    expect(root.querySelector('.notice.error')!.textContent).toContain('bum exited');
  });
});
