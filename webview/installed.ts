// Installed skills, as a table: Claude Code / Kiro tabs, a filter, sortable numbers, and per row
// on/off, remove, open SKILL.md. Changes are sent as `op` and confirmed by the extension.
import { actionsFor } from '../src/actions';
import type { SkillReport, SkillRow, Tool } from '../src/types';
import type { Bridge } from './bridge';
import { h } from './dom';
import { ago, compact } from './fmt';
import { t } from './strings';
import type { Key } from './strings';
import { renderTable } from './table';
import type { Column } from './table';

export type Filter = 'all' | 'enabled' | 'disabled' | 'unused';

export function filterRows(rows: SkillRow[], tool: Tool, filter: Filter, query = ''): SkillRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => (r.entry.tool ?? 'claude_code') === tool
    && (filter === 'all' || (filter === 'unused' ? r.unused_30d : r.entry.state === filter))
    && (!q || r.entry.name.toLowerCase().includes(q) || r.entry.description.toLowerCase().includes(q)));
}

const SOURCE: Record<string, Key> = { personal: 'personal', plugin: 'plugin', synced: 'synced', command: 'command' };
const num = (r: SkillRow, v: number | null) => (r.usage_known && v != null ? compact(v) : '–');
const byNum = (f: (r: SkillRow) => number | null) => (a: SkillRow, b: SkillRow) => (f(a) ?? -1) - (f(b) ?? -1);

export interface InstalledDeps { bridge: Bridge; onInstall: () => void; now?: () => number }

export function mountInstalled(root: HTMLElement, deps: InstalledDeps): { reload(): Promise<void>; report(): SkillReport | null; tool(): Tool } {
  let report: SkillReport | null = null;
  let error: string | null = null;
  let loadingPlugins = false;
  let tool: Tool = 'claude_code';
  let filter: Filter = 'all';
  let query = '';
  let sortKey = 'uses';
  let desc = true;
  const open = new Set<string>();
  const now = deps.now ?? Date.now;

  const run = async (op: string, target: string, r: SkillRow) => {
    await deps.bridge.op({ op, targets: [target], tool: r.entry.tool ?? 'claude_code' });
  };

  const actionCell = (r: SkillRow) => {
    const acts = actionsFor(r);
    const toggle = acts.find((a) => a.kind === 'toggle');
    const remove = acts.find((a) => a.kind === 'uninstall');
    const on = r.entry.state === 'enabled';
    const items = [
      remove && h('button', { type: 'button', 'data-action': 'uninstall', onclick: (() => void run(remove.op, remove.target, r)) as EventListener }, t('remove')),
      r.entry.path && h('button', { type: 'button', 'data-action': 'file', onclick: (() => deps.bridge.open('file', r.entry.path!)) as EventListener }, t('openFile')),
      r.entry.path && h('button', { type: 'button', 'data-action': 'folder', onclick: (() => deps.bridge.open('folder', r.entry.path!)) as EventListener }, t('openFolder')),
      r.entry.path && h('button', { type: 'button', 'data-action': 'copy', onclick: (() => deps.bridge.open('copy', r.entry.path!)) as EventListener }, t('copyPath')),
    ].filter(Boolean) as HTMLElement[];
    return h('div', { class: 'actions' },
      toggle
        ? h('button', { type: 'button', class: `toggle ${on ? 'on' : 'off'}`, 'data-action': 'toggle', title: on ? t('turnOff') : t('turnOn'),
            'aria-label': `${on ? t('turnOff') : t('turnOn')}: ${r.entry.name}`, onclick: (() => void run(toggle.op, toggle.target, r)) as EventListener }, on ? t('turnOff') : t('turnOn'))
        : h('span', { class: 'muted', title: t('readOnly') }, t('readOnly')),
      items.length ? h('details', { class: 'menu' }, h('summary', { 'aria-label': `${t('more')}: ${r.entry.name}` }, '⋯'), h('div', { class: 'menu-items' }, items)) : null);
  };

  const cols: Column<SkillRow>[] = [
    { key: 'state', label: '', cell: (r) => h('span', { class: `dot ${r.entry.state}`, title: r.entry.state === 'enabled' ? t('enabled') : t('disabled') }, r.entry.state === 'enabled' ? '●' : '○') },
    { key: 'name', label: t('colSkill'), sort: (a, b) => a.entry.name.localeCompare(b.entry.name), cell: (r) => h('span', { class: 'name' }, r.entry.name) },
    { key: 'source', label: t('colSource'), hideBelow: 520, sort: (a, b) => a.entry.source.kind.localeCompare(b.entry.source.kind),
      cell: (r) => (r.entry.source.kind === 'plugin' ? `${t('plugin')} · ${r.entry.source.plugin}` : t(SOURCE[r.entry.source.kind] ?? 'personal')) },
    { key: 'uses', label: t('colUses'), align: 'right', sort: byNum((r) => r.uses), cell: (r) => num(r, r.uses) },
    { key: 'projects', label: t('colProjects'), align: 'right', hideBelow: 640, sort: byNum((r) => r.projects), cell: (r) => num(r, r.projects) },
    { key: 'avg', label: t('colAvg'), align: 'right', hideBelow: 760, sort: byNum((r) => r.avg_tokens), cell: (r) => num(r, r.avg_tokens) },
    { key: 'always', label: t('colAlways'), title: t('alwaysTip'), align: 'right', hideBelow: 860, sort: byNum((r) => r.entry.always_on_tokens),
      cell: (r) => (r.entry.always_on_tokens == null ? '–' : `${r.entry.estimated ? '~' : ''}${compact(r.entry.always_on_tokens)}`) },
    { key: 'last', label: t('colLast'), sort: (a, b) => (Date.parse(a.last_used ?? '') || 0) - (Date.parse(b.last_used ?? '') || 0),
      cell: (r) => (r.usage_known ? ago(r.last_used, now()) : '–') },
    { key: 'actions', label: '', cell: actionCell },
  ];

  const render = () => {
    const rows = report?.rows ?? [];
    const count = (tl: Tool) => rows.filter((r) => (r.entry.tool ?? 'claude_code') === tl).length;
    const tabs = h('div', { class: 'segmented', role: 'tablist' }, (['claude_code', 'kiro'] as Tool[]).map((tl) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(tl === tool), 'data-tool': tl,
        onclick: (() => { tool = tl; render(); }) as EventListener }, `${tl === 'kiro' ? 'Kiro' : 'Claude Code'} ${count(tl)}`)));
    const search = h('input', { type: 'search', id: 'filter', placeholder: t('filter'), value: query, 'aria-label': t('filter') });
    search.addEventListener('input', () => { query = search.value; renderBody(); });
    const select = h('select', { id: 'state', 'aria-label': t('all') }, (['all', 'enabled', 'disabled', 'unused'] as Filter[]).map((f) =>
      h('option', { value: f, selected: f === filter }, t(f))));
    select.addEventListener('change', () => { filter = select.value as Filter; renderBody(); });
    const bar = h('header', { class: 'bar' }, tabs, h('div', { class: 'spacer' }), search, select,
      h('button', { type: 'button', class: 'primary', 'data-action': 'install', onclick: (() => deps.onInstall()) as EventListener }, `+ ${t('install')}`));
    const body = h('section', { class: 'body' });
    root.replaceChildren(bar, body);

    function renderBody() {
      if (error && !report) {
        body.replaceChildren(h('div', { class: 'notice error' }, error, ' ', h('button', { type: 'button', onclick: (() => void reload()) as EventListener }, t('retry'))));
        return;
      }
      if (!report) { body.replaceChildren(h('p', { class: 'muted' }, t('loading'))); return; }
      const all = filterRows(rows, tool, 'all');
      const shown = filterRows(rows, tool, filter, query);
      const notes = [
        ...report.warnings.map((w) => h('div', { class: 'notice warning' }, w)),
        error ? h('div', { class: 'notice warning' }, error) : null,
        loadingPlugins ? h('p', { class: 'muted small' }, t('loadingPlugins')) : null,
        all.length && !all.some((r) => r.usage_known) ? h('p', { class: 'muted small' }, t('noUsage')) : null,
      ];
      if (!all.length) {
        body.replaceChildren(...notes.filter(Boolean) as Node[], h('div', { class: 'empty' }, h('p', {}, t('empty')),
          h('button', { type: 'button', class: 'primary', onclick: (() => deps.onInstall()) as EventListener }, `+ ${t('install')}`)));
        return;
      }
      const table = shown.length
        ? renderTable(cols, shown, {
            sortKey, desc, open, width: root.clientWidth || 1000, rowKey: (r) => `${r.entry.tool}:${r.entry.name}`,
            dim: (r) => r.entry.state === 'disabled',
            onSort: (k, d) => { sortKey = k; desc = d; renderBody(); },
            expand: (r) => h('div', { class: 'detail' }, h('p', {}, r.entry.description || '—'),
              r.entry.path ? h('p', { class: 'muted small' }, `${t('path')}: `, h('code', {}, r.entry.path)) : null),
          })
        : h('p', { class: 'muted' }, t('noMatch'));
      const off = all.filter((r) => r.entry.state === 'disabled').length;
      const unused = all.filter((r) => r.unused_30d).length;
      body.replaceChildren(...notes.filter(Boolean) as Node[], h('div', { class: 'table-wrap' }, table),
        h('footer', { class: 'muted small' }, t('footer', { n: all.length, off, unused })));
    }
    renderBody();
  };

  async function reload(): Promise<void> {
    error = null;
    try {
      // Personal skills first (fast), then again with plugins (the `claude` CLI can be slow).
      report = await deps.bridge.call<SkillReport>('skills:list', { plugins: false });
      loadingPlugins = true;
      render();
      report = await deps.bridge.call<SkillReport>('skills:list', {});
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loadingPlugins = false;
      render();
    }
  }

  render();
  return { reload, report: () => report, tool: () => tool };
}
