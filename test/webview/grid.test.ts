import { describe, expect, it } from 'vitest';
import { arrowNav } from '../../webview/grid';
import { h } from '../../webview/dom';

describe('arrowNav', () => {
  it('← → step one card; ↑ ↓ a row; stops at the ends', () => {
    const grid = h('div', {}, ['a', 'b', 'c', 'd', 'e'].map((k) => h('article', { class: 'card', tabindex: 0, 'data-k': k })));
    document.body.replaceChildren(grid);
    // jsdom has no layout, so say how many cards sit on a row.
    arrowNav(grid, () => 2);
    const at = (k: string) => grid.querySelector<HTMLElement>(`[data-k="${k}"]`)!;
    const press = (key: string) => document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    const now = () => document.activeElement?.getAttribute('data-k');
    at('a').focus();
    press('ArrowRight'); expect(now()).toBe('b');
    press('ArrowDown'); expect(now()).toBe('d');
    press('ArrowDown'); expect(now()).toBe('e');
    press('ArrowLeft'); expect(now()).toBe('d');
    press('ArrowUp'); expect(now()).toBe('b');
    press('ArrowUp'); expect(now()).toBe('a');
  });

  it('leaves keys alone when a button inside a card has focus', () => {
    const btn = h('button', { type: 'button' }, 'x');
    const grid = h('div', {}, h('article', { class: 'card', tabindex: 0 }, btn), h('article', { class: 'card', tabindex: 0 }));
    document.body.replaceChildren(grid);
    arrowNav(grid, () => 2);
    btn.focus();
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(btn);
  });
});
