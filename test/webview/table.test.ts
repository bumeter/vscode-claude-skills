import { describe, expect, it } from 'vitest';
import { h } from '../../webview/dom';
import { renderTable } from '../../webview/table';
import type { Column } from '../../webview/table';

interface R { name: string; uses: number; off?: boolean }
const rows: R[] = [{ name: 'alpha', uses: 3 }, { name: 'beta', uses: 42 }, { name: 'gamma', uses: 0, off: true }];
const cols: Column<R>[] = [
  { key: 'name', label: 'Skill', sort: (a, b) => a.name.localeCompare(b.name), cell: (r) => r.name },
  { key: 'uses', label: 'Uses', align: 'right', sort: (a, b) => a.uses - b.uses, cell: (r) => String(r.uses) },
  { key: 'note', label: 'Note', hideBelow: 600, cell: () => 'x' },
];
const names = (t: HTMLElement) => [...t.querySelectorAll('tr.row')].map((r) => r.querySelector('td')!.textContent);

describe('renderTable', () => {
  it('sorts by the chosen column, either way', () => {
    const opts = { sortKey: 'uses', desc: true, onSort: () => undefined, rowKey: (r: R) => r.name, width: 800 };
    expect(names(renderTable(cols, rows, opts))).toEqual(['beta', 'alpha', 'gamma']);
    expect(names(renderTable(cols, rows, { ...opts, desc: false }))).toEqual(['gamma', 'alpha', 'beta']);
    expect(names(renderTable(cols, rows, { ...opts, sortKey: 'name', desc: false }))).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('clicking the active header flips it, another header sorts it descending', () => {
    const got: [string, boolean][] = [];
    const t = renderTable(cols, rows, { sortKey: 'uses', desc: true, onSort: (k, d) => got.push([k, d]), rowKey: (r) => r.name, width: 800 });
    t.querySelector<HTMLButtonElement>('th[data-key="uses"] button')!.click();
    t.querySelector<HTMLButtonElement>('th[data-key="name"] button')!.click();
    expect(got).toEqual([['uses', false], ['name', true]]);
    expect(t.querySelector('th[data-key="uses"]')!.getAttribute('aria-sort')).toBe('descending');
    expect(t.querySelector('th[data-key="note"] button')).toBeNull();
  });

  it('drops columns when narrow, dims rows, opens a row on click', () => {
    const opts = { sortKey: 'uses', desc: true, onSort: () => undefined, rowKey: (r: R) => r.name, dim: (r: R) => !!r.off, expand: (r: R) => h('p', {}, `about ${r.name}`) };
    expect(renderTable(cols, rows, { ...opts, width: 800 }).querySelectorAll('th')).toHaveLength(3);
    const t = renderTable(cols, rows, { ...opts, width: 500 });
    expect(t.querySelectorAll('th')).toHaveLength(2);
    expect(t.querySelector('tr[data-key="gamma"]')!.classList.contains('dim')).toBe(true);
    const more = t.querySelectorAll<HTMLElement>('tr.more')[0];
    expect(more.hidden).toBe(true);
    t.querySelector<HTMLElement>('tr[data-key="beta"]')!.click();
    expect(more.hidden).toBe(false);
    expect(more.textContent).toBe('about beta');
  });

  it('↓ moves to the next row', () => {
    const t = renderTable(cols, rows, { sortKey: 'uses', desc: true, onSort: () => undefined, rowKey: (r) => r.name, width: 800 });
    document.body.append(t);
    const first = t.querySelector<HTMLElement>('tr[data-key="beta"]')!;
    first.focus();
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement?.getAttribute('data-key')).toBe('alpha');
    t.remove();
  });
});
