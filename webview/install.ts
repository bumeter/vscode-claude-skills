// Install a skill: skills.sh as a grid of cards (leaderboard, or search as you type), a git URL, or a
// folder. Installing is an `op` the extension confirms.
import type { Hit, Page, Tool } from '../src/types';
import type { Bridge } from './bridge';
import { h } from './dom';
import { compact } from './fmt';
import { t } from './strings';

export type Mode = 'hot' | 'trending' | 'all-time';
type Tab = 'market' | 'git' | 'folder';

/** Same rule as the backend: a skill installs into its `skill_id` folder, so that name must be free. */
export const isInstalled = (hit: Hit, installed: Set<string>) => installed.has(hit.skill_id);

export interface InstallDeps {
  bridge: Bridge;
  back: () => void;
  tool: Tool;
  /** Names of the skills already installed, per tool. */
  installed: Record<Tool, Set<string>>;
  /** Wait after typing before searching; tests pass 0. */
  debounceMs?: number;
}

export function mountInstall(root: HTMLElement, deps: InstallDeps): { focusSearch(): void; refresh(): void } {
  let tool: Tool = deps.tool;
  let tab: Tab = 'market';
  let mode: Mode = 'trending';
  let query = '';
  let page = 1;
  let hits: Hit[] = [];
  let hasMore = false;
  let error: string | null = null;
  let loading = false;
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounce = deps.debounceMs ?? 300;

  const grid = h('div', { class: 'cards', role: 'list' });
  const status = h('div', { class: 'status' });
  const searchBox = h('input', { type: 'search', id: 'market-search', placeholder: t('search'), 'aria-label': t('search') });

  const fetchPage = async (more = false) => {
    const mine = ++seq;
    loading = true;
    error = null;
    if (!more) { page = 1; hits = []; }
    renderCards();
    try {
      if (query.trim()) {
        const found = await deps.bridge.call<Hit[]>('skills:search', { q: query.trim(), limit: 30 });
        if (mine !== seq) return;
        hits = found;
        hasMore = false;
      } else {
        const p = await deps.bridge.call<Page>('skills:top', { mode, page });
        if (mine !== seq) return;
        hits = more ? [...hits, ...p.hits] : p.hits;
        hasMore = p.has_more;
      }
    } catch (e) {
      if (mine !== seq) return;
      error = (e as Error).message;
    }
    loading = false;
    renderCards();
  };

  const install = (hit: Hit) => void deps.bridge.op({ op: 'install_market', source: hit.source, skill: hit.skill_id, tool });

  const card = (hit: Hit, rank: number) => {
    const done = isInstalled(hit, deps.installed[tool]);
    return h('article', { class: `card${done ? ' installed' : ''}`, role: 'listitem', tabindex: 0, 'data-id': hit.id,
      onkeydown: ((e: KeyboardEvent) => {
        if (e.key === 'Enter' && e.target === e.currentTarget && !done) { e.preventDefault(); install(hit); }
      }) as EventListener },
      h('div', { class: 'card-top' }, h('span', { class: 'rank' }, `#${rank}`), h('span', { class: 'installs', title: t('installs', { n: hit.installs }) }, `⬇ ${compact(hit.installs)}`)),
      h('h3', { class: 'card-name' }, hit.name),
      h('p', { class: 'card-source muted' }, hit.source),
      h('div', { class: 'card-actions' },
        h('button', { type: 'button', class: 'link', 'data-action': 'github', onclick: (() => deps.bridge.open('url', `https://github.com/${hit.source}`)) as EventListener }, t('github')),
        done
          ? h('span', { class: 'installed-mark' }, `✓ ${t('installed')}`)
          : h('button', { type: 'button', class: 'primary', 'data-action': 'install', 'aria-label': `${t('installBtn')}: ${hit.name}`, onclick: (() => install(hit)) as EventListener }, `+ ${t('installBtn')}`)));
  };

  function renderCards() {
    grid.replaceChildren(...hits.map((x, i) => card(x, i + 1)));
    const more = hasMore && !loading
      ? h('button', { type: 'button', 'data-action': 'more', onclick: (() => { page++; void fetchPage(true); }) as EventListener }, t('loadMore'))
      : null;
    const parts: (HTMLElement | null)[] = [
      error ? h('div', { class: 'notice error' }, t('marketError', { err: error })) : null,
      loading ? h('p', { class: 'muted' }, '…') : null,
      !loading && !error && !hits.length ? h('p', { class: 'muted' }, t('noHits')) : null,
      more,
    ];
    status.replaceChildren(...parts.filter((p): p is HTMLElement => !!p));
  }

  /** Arrow keys move between cards in reading order, a row at a time up and down. */
  grid.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const cards = [...grid.querySelectorAll<HTMLElement>('.card')];
    const i = cards.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const perRow = Math.max(1, cards.filter((c) => c.offsetTop === cards[0].offsetTop).length);
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -perRow : perRow;
    cards[Math.min(cards.length - 1, Math.max(0, i + step))]?.focus();
  });

  searchBox.addEventListener('input', () => {
    query = searchBox.value;
    clearTimeout(timer);
    timer = setTimeout(() => void fetchPage(), debounce);
  });

  const segmented = <T extends string>(id: string, items: [T, string][], current: T, pick: (v: T) => void) =>
    h('div', { class: 'segmented', role: 'group', id }, items.map(([v, label]) =>
      h('button', { type: 'button', 'aria-pressed': String(v === current), 'data-value': v, onclick: (() => pick(v)) as EventListener }, label)));

  const sourceForm = (kind: 'git' | 'folder') => {
    const input = h('input', { type: 'text', id: `${kind}-source`, placeholder: kind === 'git' ? 'https://github.com/owner/repo' : '/path/to/skill', 'aria-label': t(kind === 'git' ? 'gitHint' : 'folderHint') });
    const submit = () => {
      const v = input.value.trim();
      if (v) void deps.bridge.op({ op: kind === 'git' ? 'install_git' : 'install_dir', source: v, tool });
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    return h('div', { class: 'source-form' },
      h('p', { class: 'muted' }, t(kind === 'git' ? 'gitHint' : 'folderHint')),
      h('div', { class: 'row-inline' }, input,
        kind === 'folder' ? h('button', { type: 'button', 'data-action': 'choose', onclick: (async () => { const p = await deps.bridge.pickFolder(); if (p) input.value = p; }) as EventListener }, t('choose')) : null,
        h('button', { type: 'button', class: 'primary', 'data-action': 'install-source', onclick: submit as EventListener }, `+ ${t('installBtn')}`)));
  };

  const render = () => {
    const head = h('header', { class: 'bar' },
      h('button', { type: 'button', class: 'link', 'data-action': 'back', onclick: (() => deps.back()) as EventListener }, `← ${t('back')}`),
      h('div', { class: 'spacer' }),
      h('label', { class: 'muted', for: 'install-tool' }, t('installFor')),
      (() => {
        const s = h('select', { id: 'install-tool' }, h('option', { value: 'claude_code', selected: tool === 'claude_code' }, 'Claude Code'), h('option', { value: 'kiro', selected: tool === 'kiro' }, 'Kiro'));
        s.addEventListener('change', () => { tool = s.value as Tool; renderCards(); });
        return s;
      })(),
      segmented<Tab>('install-tab', [['market', t('market')], ['git', t('git')], ['folder', t('folder')]], tab, (v) => { tab = v; render(); }));
    if (tab !== 'market') {
      root.replaceChildren(head, h('section', { class: 'body' }, sourceForm(tab)));
      return;
    }
    const tools = h('div', { class: 'bar' }, searchBox,
      query.trim() ? null : segmented<Mode>('install-mode', [['hot', t('hot')], ['trending', t('trending')], ['all-time', t('allTime')]], mode, (v) => { mode = v; render(); void fetchPage(); }));
    root.replaceChildren(head, tools, h('section', { class: 'body' }, grid, status), h('footer', { class: 'muted small keys' }, t('keys')));
  };

  render();
  void fetchPage();
  return { focusSearch: () => searchBox.focus(), refresh: () => renderCards() };
}
