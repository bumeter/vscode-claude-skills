// Arrow keys between the cards of a grid, in reading order: ← → one card, ↑ ↓ a row.

/** Cards on the first row, from the layout. */
const fromLayout = (cards: HTMLElement[]) => cards.filter((c) => c.offsetTop === cards[0].offsetTop).length;

export function arrowNav(grid: HTMLElement, perRow: (cards: HTMLElement[]) => number = fromLayout): void {
  grid.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const cards = [...grid.querySelectorAll<HTMLElement>('.card')];
    const i = cards.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const n = Math.max(1, perRow(cards));
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -n : n;
    cards[Math.min(cards.length - 1, Math.max(0, i + step))]?.focus();
  });
}
