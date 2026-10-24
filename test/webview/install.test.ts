import { beforeEach, describe, expect, it } from 'vitest';
import { isInstalled, mountInstall } from '../../webview/install';
import { setLang } from '../../webview/strings';
import { PAGE } from '../fixtures';
import { fakeBridge, flush } from './fake';

const wait = () => new Promise((r) => setTimeout(r, 5));

async function mount(answers: Record<string, unknown> = {}) {
  const root = document.createElement('main');
  document.body.replaceChildren(root);
  const f = fakeBridge({ 'skills:top': PAGE, 'skills:search': PAGE.hits.slice(0, 1), ...answers });
  let backs = 0;
  mountInstall(root, { bridge: f.bridge, back: () => backs++, tool: 'claude_code', installed: { claude_code: new Set(['pdf']), kiro: new Set() }, debounceMs: 0 });
  await flush();
  return { root, f, backs: () => backs };
}
const cards = (root: HTMLElement) => [...root.querySelectorAll('.card')];

beforeEach(() => setLang('en'));

describe('install screen', () => {
  it('opens on the trending leaderboard, as cards', async () => {
    const { root, f } = await mount();
    expect(f.calls).toEqual([['skills:top', { mode: 'trending', page: 1 }]]);
    expect(cards(root)).toHaveLength(3);
    const first = cards(root)[0];
    expect(first.querySelector('.rank')!.textContent).toBe('#1');
    expect(first.querySelector('.card-name')!.textContent).toBe('pdf-tools');
    expect(first.querySelector('.card-source')!.textContent).toBe('owner/skills');
    expect(first.querySelector('.installs')!.textContent).toBe('⬇ 12.4K');
  });

  it('a skill already installed is marked and has no install button', async () => {
    const { root } = await mount();
    const pdf = root.querySelector('.card[data-id="owner/skills/pdf"]')!;
    expect(pdf.classList.contains('installed')).toBe(true);
    expect(pdf.querySelector('[data-action="install"]')).toBeNull();
    expect(pdf.textContent).toContain('✓ Installed');
    expect(isInstalled(PAGE.hits[0], new Set(['pdf']))).toBe(false);
  });

  it('install and GitHub', async () => {
    const { root, f } = await mount();
    cards(root)[0].querySelector<HTMLButtonElement>('[data-action="install"]')!.click();
    cards(root)[2].querySelector<HTMLButtonElement>('[data-action="github"]')!.click();
    await flush();
    expect(f.ops).toEqual([{ op: 'install_market', source: 'owner/skills', skill: 'pdf-tools', tool: 'claude_code' }]);
    expect(f.opened).toEqual([['url', 'https://github.com/other/repo']]);
  });

  it('Hot switches the leaderboard; load more asks the next page and appends', async () => {
    const { root, f } = await mount();
    root.querySelector<HTMLButtonElement>('#install-mode [data-value="hot"]')!.click();
    await flush();
    expect(f.calls.at(-1)).toEqual(['skills:top', { mode: 'hot', page: 1 }]);
    root.querySelector<HTMLButtonElement>('[data-action="more"]')!.click();
    await flush();
    expect(f.calls.at(-1)).toEqual(['skills:top', { mode: 'hot', page: 2 }]);
    expect(cards(root)).toHaveLength(6);
    expect(cards(root)[3].querySelector('.rank')!.textContent).toBe('#4');
  });

  it('typing searches skills.sh', async () => {
    const { root, f } = await mount();
    const box = root.querySelector<HTMLInputElement>('#market-search')!;
    box.value = 'pdf';
    box.dispatchEvent(new Event('input'));
    await wait();
    expect(f.calls.at(-1)).toEqual(['skills:search', { q: 'pdf', limit: 30 }]);
    expect(cards(root)).toHaveLength(1);
  });

  it('git URL and folder install with their own op', async () => {
    const { root, f } = await mount();
    root.querySelector<HTMLButtonElement>('#install-tab [data-value="git"]')!.click();
    root.querySelector<HTMLInputElement>('#git-source')!.value = 'https://github.com/owner/repo';
    root.querySelector<HTMLButtonElement>('[data-action="install-source"]')!.click();
    root.querySelector<HTMLButtonElement>('#install-tab [data-value="folder"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-action="choose"]')!.click();
    await flush();
    expect(root.querySelector<HTMLInputElement>('#folder-source')!.value).toBe('/home/u/my-skill');
    root.querySelector<HTMLButtonElement>('[data-action="install-source"]')!.click();
    await flush();
    expect(f.ops).toEqual([
      { op: 'install_git', source: 'https://github.com/owner/repo', tool: 'claude_code' },
      { op: 'install_dir', source: '/home/u/my-skill', tool: 'claude_code' },
    ]);
  });

  it('installing for Kiro sends that tool; Enter on a card installs it; back goes back', async () => {
    const { root, f, backs } = await mount();
    const sel = root.querySelector<HTMLSelectElement>('#install-tool')!;
    sel.value = 'kiro';
    sel.dispatchEvent(new Event('change'));
    // pdf is not installed for Kiro: it gets a button
    expect(root.querySelector('.card[data-id="owner/skills/pdf"] [data-action="install"]')).not.toBeNull();
    const c = cards(root)[1] as HTMLElement;
    c.focus();
    c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();
    expect(f.ops).toEqual([{ op: 'install_market', source: 'owner/skills', skill: 'pdf', tool: 'kiro' }]);
    root.querySelector<HTMLButtonElement>('[data-action="back"]')!.click();
    expect(backs()).toBe(1);
  });

  it('skills.sh down: an error, and the git tab still works', async () => {
    const { root } = await mount({ 'skills:top': new Error('skills.sh did not respond') });
    expect(root.querySelector('.notice.error')!.textContent).toContain('skills.sh did not respond');
    root.querySelector<HTMLButtonElement>('#install-tab [data-value="git"]')!.click();
    expect(root.querySelector('#git-source')).not.toBeNull();
  });
});
