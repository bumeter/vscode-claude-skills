import { beforeEach, describe, expect, it } from 'vitest';
import { filterRows, mountInstalled } from '../../webview/installed';
import { setLang } from '../../webview/strings';
import { REPORT, row } from '../fixtures';
import { fakeBridge, flush } from './fake';

const NOW = Date.parse('2026-10-24T12:00:00Z');
const names = (root: HTMLElement) => [...root.querySelectorAll('tr.row .name')].map((e) => e.textContent);

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

describe('installed table', () => {
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

  it('the numbers, the dimmed disabled row and the footer', async () => {
    const { root } = await mount();
    const brain = root.querySelector('tr[data-key="claude_code:brainstorming"]')!;
    expect([...brain.querySelectorAll('td')].map((td) => td.textContent).slice(0, 8)).toEqual(['●', 'brainstorming', 'Personal', '42', '3', '1.2K', '~60', 'yesterday']);
    expect(root.querySelector('tr[data-key="claude_code:pdf"]')!.classList.contains('dim')).toBe(true);
    expect(root.querySelector('footer')!.textContent).toBe('4 skills · 1 disabled · 1 unused for 30 days');
  });

  it('read-only skills have no on/off; the toggle and remove send ops with the right target', async () => {
    const { root, f } = await mount();
    expect(root.querySelector('tr[data-key="claude_code:docs"] [data-action="toggle"]')).toBeNull();
    expect(root.querySelector('tr[data-key="claude_code:docs"]')!.textContent).toContain('Read-only');
    root.querySelector<HTMLButtonElement>('tr[data-key="claude_code:pdf"] [data-action="toggle"]')!.click();
    root.querySelector<HTMLButtonElement>('tr[data-key="claude_code:tools:code-review"] [data-action="toggle"]')!.click();
    root.querySelector<HTMLButtonElement>('tr[data-key="claude_code:brainstorming"] [data-action="uninstall"]')!.click();
    await flush();
    expect(f.ops).toEqual([
      { op: 'enable', targets: ['pdf'], tool: 'claude_code' },
      { op: 'plugin_disable', targets: ['tools'], tool: 'claude_code' },
      { op: 'uninstall', targets: ['brainstorming'], tool: 'claude_code' },
    ]);
    root.querySelector<HTMLButtonElement>('tr[data-key="claude_code:brainstorming"] [data-action="file"]')!.click();
    expect(f.opened).toEqual([['file', '/home/u/.claude/skills/brainstorming']]);
  });

  it('no usage numbers: dashes and a note; warnings show; empty offers to install', async () => {
    const noUsage = { ...REPORT, rows: [row('alpha', { usage_known: false })], warnings: ['`claude` not found: plugin skills are not listed'] };
    const { root } = await mount(noUsage);
    expect([...root.querySelectorAll('tr.row td')].map((td) => td.textContent).slice(3, 4)).toEqual(['–']);
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
