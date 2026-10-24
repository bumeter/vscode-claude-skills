// Screenshots for the README: the real webview (dist/webview.js + .css) on made-up skills, in a headless Chrome.
//   npm run build && CHROME=/path/to/chrome node scripts/screenshots.mjs
// Writes media/screenshots/*.png. Demo data only: no real paths, projects or user names.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'media', 'screenshots');
const chrome = process.env.CHROME;
if (!chrome) {
  console.error('set CHROME to a Chrome or chrome-headless-shell binary');
  process.exit(1);
}

const day = 86_400_000;
const ago = (days) => new Date(Date.now() - days * day).toISOString();
const row = (name, o = {}) => ({
  entry: { name, tool: 'claude_code', description: o.desc, source: o.source ?? { kind: 'personal' }, state: o.off ? 'disabled' : 'enabled',
    path: `~/.claude/skills/${name}`, symlink: false, installed_at: ago(60), always_on_tokens: o.always ?? 80, on_invoke_tokens: 3000,
    estimated: true, managed: o.source?.kind !== 'synced', ...o.entry },
  uses: o.uses ?? 0, projects: o.projects ?? 0, tokens: 0, avg_tokens: o.avg ?? null, last_used: o.last == null ? null : ago(o.last),
  unused_30d: o.unused ?? false, usage_known: true,
});
const rows = [
  row('brainstorming', { uses: 42, projects: 6, avg: 48_000, last: 0.2, always: 96, desc: 'Turn a rough idea into a design: ask one question at a time, propose approaches, write the spec.' }),
  row('code-review', { uses: 31, projects: 4, avg: 61_000, last: 1, always: 120, source: { kind: 'plugin', plugin: 'dev-tools' }, desc: 'Review a change before it is merged: bugs first, then tests, then style.' }),
  row('test-runner', { uses: 27, projects: 5, avg: 35_000, last: 0.5, always: 74, desc: 'Run the project tests, read the failures and fix the code, not the tests.' }),
  row('commit-message', { uses: 19, projects: 6, avg: 12_000, last: 2, always: 52, desc: 'Write a commit message from the staged diff: what changed and why, in one short subject line.' }),
  row('sql-helper', { uses: 8, projects: 2, avg: 22_000, last: 6, always: 88, desc: 'Explain, write and tune SQL queries for Postgres and SQLite.' }),
  row('api-docs', { uses: 5, projects: 1, avg: 18_000, last: 12, always: 140, source: { kind: 'synced' }, desc: 'Write reference docs for an HTTP API from its routes and types.' }),
  row('changelog', { uses: 3, projects: 2, avg: 9_000, last: 20, always: 64, source: { kind: 'plugin', plugin: 'dev-tools' }, desc: 'Keep CHANGELOG.md up to date from the merged pull requests.' }),
  row('pdf-forms', { off: true, unused: true, always: 125, desc: 'Read PDF files and fill in PDF forms.' }),
  row('slides', { unused: true, last: 45, uses: 1, projects: 1, always: 210, desc: 'Build a slide deck from an outline, with speaker notes.' }),
  row('planner', { uses: 9, projects: 2, last: 3, entry: { tool: 'kiro', path: '~/.kiro/skills/planner' }, desc: 'Break a feature into small tasks with tests.' }),
  row('reviewer', { uses: 4, projects: 1, last: 8, entry: { tool: 'kiro', path: '~/.kiro/skills/reviewer' }, desc: 'Review a Kiro spec for gaps.' }),
];
const report = { rows, commands: [], total_always_on: 0, unused: [], unused_always_on: 0, warnings: [] };
const hit = (source, name, installs) => ({ id: `${source}/${name}`, source, skill_id: name, name, installs });
const page = { has_more: true, total: 200, hits: [
  hit('example/agent-skills', 'frontend-design', 184_000), hit('example/agent-skills', 'test-runner', 152_000), hit('acme/skills', 'pdf-tools', 98_400),
  hit('acme/skills', 'spreadsheet', 76_200), hit('example/agent-skills', 'brainstorming', 64_900), hit('devkit/skills', 'docker-compose', 41_300),
  hit('devkit/skills', 'k8s-debug', 33_800), hit('acme/skills', 'slides', 28_100), hit('notes/skills', 'meeting-notes', 19_600),
  hit('devkit/skills', 'sql-helper', 15_200), hit('notes/skills', 'release-notes', 11_700), hit('example/agent-skills', 'code-review', 9_400),
] };
const answers = { 'skills:list': report, 'skills:top': page, 'skills:search': page.hits, 'skills:count': { claude_code: 9, kiro: 2, total: 11 } };

const DARK = `--vscode-editor-background:#1f1f1f;--vscode-foreground:#cccccc;--vscode-descriptionForeground:#9d9d9d;--vscode-panel-border:#2b2b2b;
--vscode-button-background:#0078d4;--vscode-button-foreground:#fff;--vscode-button-hoverBackground:#026ec1;--vscode-button-secondaryBackground:#313131;--vscode-button-secondaryForeground:#ccc;--vscode-button-secondaryHoverBackground:#3c3c3c;
--vscode-input-background:#313131;--vscode-input-foreground:#ccc;--vscode-input-border:#3c3c3c;--vscode-input-placeholderForeground:#989898;--vscode-dropdown-background:#313131;--vscode-dropdown-foreground:#ccc;--vscode-dropdown-border:#3c3c3c;
--vscode-list-hoverBackground:#2a2d2e;--vscode-list-inactiveSelectionBackground:#37373d;--vscode-focusBorder:#0078d4;--vscode-textLink-foreground:#4daafc;--vscode-testing-iconPassed:#73c991;
--vscode-editorWidget-background:#202020;--vscode-menu-background:#1f1f1f;--vscode-menu-foreground:#ccc;--vscode-menu-selectionBackground:#0078d4;--vscode-menu-selectionForeground:#fff;--vscode-editorWarning-foreground:#cca700;--vscode-editorError-foreground:#f85149;--vscode-widget-shadow:rgba(0,0,0,.36);`;
const LIGHT = `--vscode-editor-background:#ffffff;--vscode-foreground:#3b3b3b;--vscode-descriptionForeground:#717171;--vscode-panel-border:#e5e5e5;
--vscode-button-background:#005fb8;--vscode-button-foreground:#fff;--vscode-button-hoverBackground:#0258a8;--vscode-button-secondaryBackground:#e5e5e5;--vscode-button-secondaryForeground:#3b3b3b;--vscode-button-secondaryHoverBackground:#cccccc;
--vscode-input-background:#ffffff;--vscode-input-foreground:#3b3b3b;--vscode-input-border:#cecece;--vscode-input-placeholderForeground:#767676;--vscode-dropdown-background:#ffffff;--vscode-dropdown-foreground:#3b3b3b;--vscode-dropdown-border:#cecece;
--vscode-list-hoverBackground:#f2f2f2;--vscode-list-inactiveSelectionBackground:#e4e6f1;--vscode-focusBorder:#005fb8;--vscode-textLink-foreground:#005fb8;--vscode-testing-iconPassed:#388a34;
--vscode-editorWidget-background:#f8f8f8;--vscode-menu-background:#ffffff;--vscode-menu-foreground:#3b3b3b;--vscode-menu-selectionBackground:#005fb8;--vscode-menu-selectionForeground:#fff;--vscode-editorWarning-foreground:#bf8803;--vscode-editorError-foreground:#e51400;--vscode-widget-shadow:rgba(0,0,0,.16);`;
const FONTS = `--vscode-font-family:-apple-system,"Segoe UI",Ubuntu,sans-serif;--vscode-font-size:13px;--vscode-editor-font-family:Consolas,"DejaVu Sans Mono",monospace;`;

/** The page as the extension builds it, with acquireVsCodeApi answering from `answers`; `then` runs after it has loaded. */
const page_ = ({ theme, start, then = '' }) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="webview.css">
<style>html{${FONTS}${theme}}</style></head><body data-start="${start}"><main id="app"></main><script>
const ANS=${JSON.stringify(answers)};
window.acquireVsCodeApi=()=>({postMessage(m){setTimeout(()=>{if(m.type==='call')window.postMessage({type:'result',id:m.id,result:ANS[m.method]},'*');},10);}});
setTimeout(()=>{${then}},600);
</script><script src="webview.js"></script></body></html>`;

/** VS Code's status bar with Claude Code Usage next to us, and our tooltip open. */
const statusBar = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;height:100vh;background:#1f1f1f;font:12px -apple-system,"Segoe UI",Ubuntu,sans-serif;color:#ccc;display:flex;flex-direction:column;justify-content:flex-end}
.bar{height:22px;background:#181818;border-top:1px solid #2b2b2b;display:flex;align-items:center;justify-content:space-between;padding:0 6px}
.bar span{padding:0 6px;display:inline-flex;align-items:center;gap:4px;height:22px}.me{background:#ffffff1f}
svg{width:14px;height:14px;fill:currentColor}
.tip{position:absolute;right:120px;bottom:30px;width:300px;background:#202020;border:1px solid #454545;border-radius:4px;box-shadow:0 2px 8px #0000005c;padding:10px 12px;font-size:13px;line-height:1.5}
.tip p{margin:0 0 8px}.tip p:last-child{margin:0}.tip a{color:#4daafc;text-decoration:none}.muted{color:#9d9d9d;font-style:italic}
</style></head><body><div class="tip"><p><b>Skill Manager</b> · 11 skills</p><p>Claude Code 9 · Kiro 2</p><p class="muted">Plugin skills are not counted.</p><p><a>Open</a> · <a>Refresh</a></p></div>
<div class="bar"><div><span>⎇ main</span><span>⊗ 0 ⚠ 0</span></div><div><span>Ln 12, Col 4</span><span>UTF-8</span><span><svg viewBox="0 0 48 48"><path d="M24 3c3.9 7.6 15 12.9 15 24.8C39 37.3 32.3 44 24 44S9 37.3 9 27.8c0-7 4-11 6.5-15 1 3.4 3 5.4 3 5.4C18.7 11.4 20.3 7 24 3z"/></svg> 5h 62% · 7d 41%</span>
<span class="me"><svg viewBox="0 0 16 16"><path d="M14.5 2H9l-.35.15-.65.64-.65-.64L7 2H1.5l-.5.5v10l.5.5h5.29l.86.85h.7l.86-.85h5.29l.5-.5v-10l-.5-.5zm-7 10.32l-.18-.17L7 12H2V3h4.79l.74.74-.03 8.58zM14 12H9l-.35.15-.14.13V3.7l.7-.7H14v9z"/></svg> Skill Manager · 11</span></div></div></body></html>`;

const dir = mkdtempSync(join(tmpdir(), 'skills-shots-'));
copyFileSync(join(root, 'dist', 'webview.js'), join(dir, 'webview.js'));
copyFileSync(join(root, 'dist', 'webview.css'), join(dir, 'webview.css'));
mkdirSync(out, { recursive: true });

const openCard = `document.querySelector('.card[data-key="claude_code:brainstorming"]').click();`;
const shots = [
  ['installed', page_({ theme: DARK, start: 'installed', then: openCard }), 1100, 760],
  ['installed-light', page_({ theme: LIGHT, start: 'installed' }), 1100, 700],
  ['install', page_({ theme: DARK, start: 'install' }), 1100, 620],
  ['status-bar', statusBar, 900, 190],
];
for (const [name, html, w, h] of shots) {
  const file = join(dir, `${name}.html`);
  writeFileSync(file, html);
  execFileSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', '--virtual-time-budget=3000',
    `--window-size=${w},${h}`, `--screenshot=${join(out, `${name}.png`)}`, `file://${file}`], { stdio: 'ignore' });
  console.log(`media/screenshots/${name}.png`);
}
