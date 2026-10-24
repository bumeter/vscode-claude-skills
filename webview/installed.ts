// Installed skills, as a grid of cards: Claude Code / Kiro tabs, a filter, a sort, and per card
// on/off, remove, open SKILL.md. Changes are sent as `op` and confirmed by the extension.
import { actionsFor } from '../src/actions';
import type { SkillReport, SkillRow, Tool } from '../src/types';
import type { Bridge } from './bridge';
import { h } from './dom';
import { ago, compact } from './fmt';
import { arrowNav } from './grid';
import { t } from './strings';
import type { Key } from './strings';

export type Filter = 'all' | 'enabled' | 'disabled' | 'unused';
export type Sort = 'uses' | 'name' | 'always' | 'last';

export function filterRows(rows: SkillRow[], tool: Tool, filter: Filter, query = ''): SkillRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter((r) => (r.entry.tool ?? 'claude_code') === tool
    && (filter === 'all' || (filter === 'unused' ? r.unused_30d : r.entry.state === filter))
    && (!q || r.entry.name.toLowerCase().includes(q) || r.entry.description.toLowerCase().includes(q)));
}

const SOURCE: Record<string, Key> = { personal: 'personal', plugin: 'plugin', synced: 'synced', command: 'command' };
const byNum = (f: (r: SkillRow) => number | null) => (a: SkillRow, b: SkillRow) => (f(b) ?? -1) - (f(a) ?? -1);
const SORTS: Record<Sort, [Key, (a: SkillRow, b: SkillRow) => number]> = {
  uses: ['sortUses', byNum((r) => r.uses)],
  name: ['sortName', (a, b) => a.entry.name.localeCompare(b.entry.name)],
  always: ['sortAlways', byNum((r) => r.entry.always_on_tokens)],
  last: ['sortLast', byNum((r) => Date.parse(r.last_used ?? '') || null)],
};

/** Most used first, then by name; the other sorts likewise, ties by name. */
export function sortRows(rows: SkillRow[], sort: Sort): SkillRow[] {
  const by = SORTS[sort][1];
  return [...rows].sort((a, b) => by(a, b) || a.entry.name.localeCompare(b.entry.name));
}

const sourceLabel = (r: SkillRow) =>
  (r.entry.source.kind === 'plugin' ? `${t('plugin')} · ${r.entry.source.plugin}` : t(SOURCE[r.entry.source.kind] ?? 'personal'));
const keyOf = (r: SkillRow) => `${r.entry.tool ?? 'claude_code'}:${r.entry.name}`;

export interface InstalledDeps { bridge: Bridge; onInstall: () => void; now?: () => number }

export function mountInstalled(root: HTMLElement, deps: InstalledDeps): { reload(): Promise<void>; report(): SkillReport | null; tool(): Tool } {
  let report: SkillReport | null = null;
  let error: string | null = null;
  let loadingPlugins = false;
  let tool: Tool = 'claude_code';
  let filter: Filter = 'all';
  let query = '';
  let sort: Sort = 'uses';
  const open = new Set<string>();
  const now = deps.now ?? Date.now;

  const run = async (op: string, target: string, r: SkillRow) => {
    await deps.bridge.op({ op, targets: [target], tool: r.entry.tool ?? 'claude_code' });
  };

  const actionBar = (r: SkillRow) => {
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
    return h('div', { class: 'card-actions' },
      toggle
        ? h('button', { type: 'button', class: `toggle ${on ? 'on' : 'off'}`, 'data-action': 'toggle', title: on ? t('turnOff') : t('turnOn'),
            'aria-label': `${on ? t('turnOff') : t('turnOn')}: ${r.entry.name}`, onclick: (() => void run(toggle.op, toggle.target, r)) as EventListener }, on ? t('turnOff') : t('turnOn'))
        : h('span', { class: 'muted', title: t('readOnly') }, t('readOnly')),
      items.length ? h('details', { class: 'menu' }, h('summary', { 'aria-label': `${t('more')}: ${r.entry.name}` }, '⋯'), h('div', { class: 'menu-items' }, items)) : null);
  };

  const stats = (r: SkillRow) => {
    const last = r.unused_30d ? t('unused') : ago(r.last_used, now());
    return t('usesLine', {
      uses: t(r.uses === 1 ? 'usesOne' : 'usesN', { n: compact(r.uses) }),
      projects: t(r.projects === 1 ? 'projectsOne' : 'projectsN', { n: compact(r.projects) }),
      last,
    });
  };

  const card = (r: SkillRow) => {
    const key = keyOf(r);
    const on = r.entry.state === 'enabled';
    const more = h('div', { class: 'card-more', hidden: !open.has(key) },
      h('p', {}, r.entry.description || '—'),
      r.usage_known && r.avg_tokens != null ? h('p', { class: 'muted small' }, t('avgLine', { n: compact(r.avg_tokens) })) : null,
      r.entry.path ? h('p', { class: 'muted small' }, `${t('path')}: `, h('code', {}, r.entry.path)) : null);
    const el = h('article', { class: `card skill${on ? '' : ' dim'}${open.has(key) ? ' open' : ''}`, role: 'listitem', tabindex: 0, 'data-key': key, 'aria-expanded': String(open.has(key)) },
      h('div', { class: 'card-head' },
        h('span', { class: `dot ${r.entry.state}`, title: on ? t('enabled') : t('disabled') }, on ? '●' : '○'),
        h('h3', { class: 'card-name' }, r.entry.name)),
      h('p', { class: 'card-source muted' }, sourceLabel(r)),
      h('p', { class: 'card-desc' }, r.entry.description || '—'),
      r.usage_known ? h('p', { class: `card-stats muted small${r.unused_30d ? ' unused' : ''}` }, stats(r)) : null,
      h('p', { class: 'card-always muted small', title: t('alwaysTip') },
        r.entry.always_on_tokens == null ? '–' : t('alwaysLine', { n: `${r.entry.estimated ? '~' : ''}${compact(r.entry.always_on_tokens)}` })),
      more,
      actionBar(r));
    const toggle = () => {
      if (open.has(key)) open.delete(key);
      else open.add(key);
      more.hidden = !open.has(key);
      el.classList.toggle('open', open.has(key));
      el.setAttribute('aria-expanded', String(open.has(key)));
    };
    el.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, a, input, select, details')) return;
      toggle();
    });
    el.addEventListener('keydown', (e) => {
      if (e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); }
    });
    return el;
  };

  const render = () => {
    const rows = report?.rows ?? [];
    const count = (tl: Tool) => rows.filter((r) => (r.entry.tool ?? 'claude_code') === tl).length;
    const tabs = h('div', { class: 'segmented', role: 'tablist' }, (['claude_code', 'kiro'] as Tool[]).map((tl) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(tl === tool), 'data-tool': tl,
        onclick: (() => { tool = tl; render(); }) as EventListener }, `${tl === 'kiro' ? 'Kiro' : 'Claude Code'} ${count(tl)}`)));
    const search = h('input', { type: 'search', id: 'filter', placeholder: t('filter'), value: query, 'aria-label': t('filter') });
    search.addEventListener('input', () => { query = search.value; renderBody(); });
    const sortBox = h('select', { id: 'sort', 'aria-label': t('sortBy') }, (Object.keys(SORTS) as Sort[]).map((k) =>
      h('option', { value: k, selected: k === sort }, t(SORTS[k][0]))));
    sortBox.addEventListener('change', () => { sort = sortBox.value as Sort; renderBody(); });
    const select = h('select', { id: 'state', 'aria-label': t('all') }, (['all', 'enabled', 'disabled', 'unused'] as Filter[]).map((f) =>
      h('option', { value: f, selected: f === filter }, t(f))));
    select.addEventListener('change', () => { filter = select.value as Filter; renderBody(); });
    const bar = h('header', { class: 'bar' }, tabs, h('div', { class: 'spacer' }), search, select, sortBox,
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
      const grid = shown.length ? h('div', { class: 'cards', role: 'list' }, sortRows(shown, sort).map(card)) : h('p', { class: 'muted' }, t('noMatch'));
      if (shown.length) arrowNav(grid);
      const off = all.filter((r) => r.entry.state === 'disabled').length;
      const unused = all.filter((r) => r.unused_30d).length;
      body.replaceChildren(...notes.filter(Boolean) as Node[], grid,
        h('footer', { class: 'muted small foot' }, h('span', {}, t('footer', { n: all.length, off, unused })), h('span', {}, t('keysInstalled'))));
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
