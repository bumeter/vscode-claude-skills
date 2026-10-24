import { describe, expect, it } from 'vitest';
import { ALLOWED, buildHtml, handleMessage } from '../src/panel';
import type { PanelDeps } from '../src/panel';

describe('buildHtml', () => {
  const html = buildHtml({ scriptUri: 'vscode-resource:/dist/webview.js', styleUri: 'vscode-resource:/dist/webview.css', cspSource: 'vscode-resource:', nonce: 'N0nce', lang: 'vi', start: 'install' });
  it('a strict CSP: nothing but our script (by nonce) and our styles', () => {
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'nonce-N0nce'");
    expect(html).toContain('style-src vscode-resource:');
    expect(html).not.toMatch(/connect-src|https:\/\//);
    expect(html).toContain('<script nonce="N0nce" src="vscode-resource:/dist/webview.js"></script>');
    expect(html).toContain('href="vscode-resource:/dist/webview.css"');
  });
  it('tells the page its language and first screen', () => {
    expect(html).toContain('<html lang="vi"');
    expect(html).toContain('data-start="install"');
  });
});

function deps() {
  const posted: unknown[] = [];
  const calls: [string, unknown][] = [];
  const opened: [string, string][] = [];
  const d: PanelDeps = {
    rpc: { call: async <T>(m: string, p?: unknown) => { calls.push([m, p]); return { ok: m } as T; } },
    runOp: async () => true,
    open: (kind, target) => { opened.push([kind, target]); },
    pickFolder: async () => '/home/u/my-skill',
    post: (m) => { posted.push(m); },
  };
  return { d, posted, calls, opened };
}

describe('handleMessage', () => {
  it('passes the read-only calls to bum', async () => {
    const f = deps();
    await handleMessage({ type: 'call', id: 1, method: 'skills:top', params: { mode: 'hot', page: 1 } }, f.d);
    expect(f.calls).toEqual([['skills:top', { mode: 'hot', page: 1 }]]);
    expect(f.posted).toEqual([{ type: 'result', id: 1, result: { ok: 'skills:top' } }]);
    expect(ALLOWED).toEqual(['skills:list', 'skills:search', 'skills:top', 'skills:count']);
  });

  it('refuses everything else: changes go through `op`, settings are not the page\'s business', async () => {
    for (const method of ['skills:apply', 'skills:plan', 'skills:undo', 'settings:statusline_apply', 'limit_state']) {
      const f = deps();
      await handleMessage({ type: 'call', id: 2, method, params: {} }, f.d);
      expect(f.calls).toEqual([]);
      expect(f.posted).toEqual([{ type: 'result', id: 2, error: `not allowed: ${method}` }]);
    }
  });

  it('an op runs through runOp; when applied the page is told to reload', async () => {
    const f = deps();
    await handleMessage({ type: 'op', id: 3, req: { op: 'disable', targets: ['pdf'], tool: 'claude_code' } }, f.d);
    expect(f.posted).toEqual([{ type: 'changed' }, { type: 'result', id: 3, result: true }]);
    const g = deps();
    g.d.runOp = async () => false;
    await handleMessage({ type: 'op', id: 4, req: { op: 'disable' } }, g.d);
    expect(g.posted).toEqual([{ type: 'result', id: 4, result: false }]);
  });

  it('opens a skill\'s file or folder, GitHub links only, and picks a folder', async () => {
    const f = deps();
    await handleMessage({ type: 'open', kind: 'file', target: '/home/u/.claude/skills/pdf' }, f.d);
    await handleMessage({ type: 'open', kind: 'url', target: 'https://github.com/owner/repo' }, f.d);
    await handleMessage({ type: 'open', kind: 'url', target: 'https://evil.example/x' }, f.d);
    await handleMessage({ type: 'open', kind: 'url', target: 'javascript:alert(1)' }, f.d);
    expect(f.opened).toEqual([['file', '/home/u/.claude/skills/pdf'], ['url', 'https://github.com/owner/repo']]);
    await handleMessage({ type: 'pickFolder', id: 5 }, f.d);
    expect(f.posted).toContainEqual({ type: 'result', id: 5, result: '/home/u/my-skill' });
  });

  it('a failing call comes back as an error, not a crash', async () => {
    const f = deps();
    f.d.rpc = { call: async () => { throw new Error('skills.sh unreachable'); } };
    await handleMessage({ type: 'call', id: 6, method: 'skills:search', params: { q: 'pdf' } }, f.d);
    expect(f.posted).toEqual([{ type: 'result', id: 6, error: 'skills.sh unreachable' }]);
  });
});
