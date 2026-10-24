// A sortable table: click a header to sort (again to flip), narrow tabs drop the less important columns,
// a row opens to show more, ↑ ↓ move between rows.
import { h } from './dom';

export interface Column<R> {
  key: string;
  label: string;
  title?: string;
  align?: 'right';
  /** Without it the column cannot be sorted. */
  sort?: (a: R, b: R) => number;
  cell: (r: R) => Node | string;
  /** Hidden when the table is narrower than this (px). */
  hideBelow?: number;
}

export interface TableOptions<R> {
  sortKey: string;
  desc: boolean;
  onSort: (key: string, desc: boolean) => void;
  rowKey: (r: R) => string;
  /** The open row's extra content. */
  expand?: (r: R) => Node;
  dim?: (r: R) => boolean;
  /** Width the table has, to pick the columns. */
  width: number;
  /** Rows open at render time (kept by the caller across re-renders). */
  open?: Set<string>;
}

export function visibleColumns<R>(cols: Column<R>[], width: number): Column<R>[] {
  return cols.filter((c) => !c.hideBelow || width >= c.hideBelow);
}

export function sortRows<R>(cols: Column<R>[], rows: R[], key: string, desc: boolean): R[] {
  const col = cols.find((c) => c.key === key);
  if (!col?.sort) return rows;
  const s = [...rows].sort(col.sort);
  return desc ? s.reverse() : s;
}

export function renderTable<R>(cols: Column<R>[], rows: R[], o: TableOptions<R>): HTMLTableElement {
  const shown = visibleColumns(cols, o.width);
  const open = o.open ?? new Set<string>();
  const head = h('tr', {}, shown.map((c) => {
    const active = c.key === o.sortKey;
    const label = `${c.label}${active ? (o.desc ? ' ▾' : ' ▴') : ''}`;
    return h('th', { class: [c.align === 'right' ? 'num' : '', c.sort ? 'sortable' : ''].join(' ').trim() || null, title: c.title ?? null,
      'aria-sort': active ? (o.desc ? 'descending' : 'ascending') : null, 'data-key': c.key },
      c.sort ? h('button', { type: 'button', onclick: (() => o.onSort(c.key, active ? !o.desc : true)) as EventListener }, label) : label);
  }));
  const body = h('tbody');
  for (const r of sortRows(cols, rows, o.sortKey, o.desc)) {
    const key = o.rowKey(r);
    const tr = h('tr', { class: ['row', o.dim?.(r) ? 'dim' : '', open.has(key) ? 'open' : ''].join(' ').trim(), tabindex: 0, 'data-key': key },
      shown.map((c) => h('td', { class: c.align === 'right' ? 'num' : null }, c.cell(r))));
    const more = o.expand ? h('tr', { class: 'more', hidden: !open.has(key) }, h('td', { colspan: shown.length }, o.expand(r))) : null;
    const toggle = () => {
      if (!more) return;
      if (open.has(key)) open.delete(key);
      else open.add(key);
      more.hidden = !open.has(key);
      tr.classList.toggle('open', open.has(key));
    };
    tr.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button, a, input, select')) return;
      toggle();
    });
    tr.addEventListener('keydown', (e) => {
      if (e.target !== tr) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const rowsEls = [...body.querySelectorAll<HTMLElement>('tr.row')];
        rowsEls[rowsEls.indexOf(tr) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
      }
    });
    body.append(tr);
    if (more) body.append(more);
  }
  return h('table', { class: 'grid' }, h('thead', {}, head), body);
}
