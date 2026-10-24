// The Skill Manager page: the installed skills, and the install screen over it.
import type { Tool } from '../src/types';
import { bridge, onMessage } from './bridge';
import { h } from './dom';
import { mountInstall } from './install';
import { mountInstalled } from './installed';
import { setLang } from './strings';

setLang(document.documentElement.lang);
const app = document.getElementById('app')!;
const installedRoot = h('div', { class: 'screen', id: 'installed' });
const installRoot = h('div', { class: 'screen', id: 'install', hidden: true });
app.append(installedRoot, installRoot);

const names: Record<Tool, Set<string>> = { claude_code: new Set(), kiro: new Set() };
let installScreen: ReturnType<typeof mountInstall> | undefined;

/** Keep the names in place: the install screen holds these sets. */
function syncNames(): void {
  for (const tool of ['claude_code', 'kiro'] as Tool[]) {
    names[tool].clear();
    for (const r of installed.report()?.rows ?? []) if ((r.entry.tool ?? 'claude_code') === tool) names[tool].add(r.entry.path?.split(/[\\/]/).pop() ?? r.entry.name);
  }
  installScreen?.refresh();
}

function showInstall(): void {
  installedRoot.hidden = true;
  installRoot.hidden = false;
  installScreen ??= mountInstall(installRoot, { bridge, tool: installed.tool(), installed: names, back: showInstalled });
  installScreen.focusSearch();
}

function showInstalled(): void {
  installRoot.hidden = true;
  installedRoot.hidden = false;
}

const installed = mountInstalled(installedRoot, { bridge, onInstall: showInstall });
const reload = () => installed.reload().then(syncNames);

onMessage('changed', () => void reload());
onMessage('install', showInstall);
document.addEventListener('keydown', (e) => {
  const typing = (e.target as HTMLElement).closest('input, select, textarea');
  if (!typing && (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'f'))) {
    const box = document.querySelector<HTMLInputElement>(installRoot.hidden ? '#filter' : '#market-search');
    if (box) { e.preventDefault(); box.focus(); }
  }
});

void reload();
if (document.body.dataset.start === 'install') showInstall();
