// The Skill Manager tab: a webview with our own page (webview/), and the bridge between it and `bum rpc`.
// The page may only read (ALLOWED); every change is an `op`, which the extension confirms and applies.
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Lang } from '@bumeter/vscode-kit/format';
import { t } from './strings';
import type { OpRequest } from './types';

export const ALLOWED = ['skills:list', 'skills:search', 'skills:top', 'skills:count'];

export type Screen = 'installed' | 'install';
export type OpenKind = 'file' | 'folder' | 'copy' | 'url';

export type InMessage =
  | { type: 'call'; id: number; method: string; params?: unknown }
  | { type: 'op'; id: number; req: OpRequest }
  | { type: 'open'; kind: OpenKind; target: string }
  | { type: 'pickFolder'; id: number };
export type OutMessage = { type: 'result'; id: number; result?: unknown; error?: string } | { type: 'changed' } | { type: 'install' };

export interface PanelDeps {
  rpc: { call<T>(method: string, params?: unknown): Promise<T> };
  /** True when the change was applied. */
  runOp(req: OpRequest): Promise<boolean>;
  open(kind: OpenKind, target: string): void;
  pickFolder(): Promise<string | undefined>;
  post(m: OutMessage): void;
}

/** The page. Pure, for tests. */
export function buildHtml(o: { scriptUri: string; styleUri: string; cspSource: string; nonce: string; lang: Lang; start: Screen }): string {
  const csp = [`default-src 'none'`, `style-src ${o.cspSource}`, `font-src ${o.cspSource}`, `img-src ${o.cspSource} data:`, `script-src 'nonce-${o.nonce}'`].join('; ');
  return `<!DOCTYPE html>
<html lang="${o.lang}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${o.styleUri}">
<title>Skill Manager</title>
</head>
<body data-start="${o.start}">
<main id="app"></main>
<script nonce="${o.nonce}" src="${o.scriptUri}"></script>
</body>
</html>`;
}

const fail = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** One message from the page. Pure given `deps`, for tests. */
export async function handleMessage(m: InMessage, deps: PanelDeps): Promise<void> {
  switch (m.type) {
    case 'call':
      if (!ALLOWED.includes(m.method)) return deps.post({ type: 'result', id: m.id, error: `not allowed: ${m.method}` });
      try {
        deps.post({ type: 'result', id: m.id, result: await deps.rpc.call(m.method, m.params ?? {}) });
      } catch (e) {
        deps.post({ type: 'result', id: m.id, error: fail(e) });
      }
      return;
    case 'op': {
      const applied = await deps.runOp(m.req).catch(() => false);
      if (applied) deps.post({ type: 'changed' });
      return deps.post({ type: 'result', id: m.id, result: applied });
    }
    case 'open':
      if (m.kind === 'url' && !m.target.startsWith('https://github.com/')) return;
      return deps.open(m.kind, m.target);
    case 'pickFolder':
      return deps.post({ type: 'result', id: m.id, result: await deps.pickFolder() });
  }
}

export function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}

/** Opens what the page asks for, the VS Code way. */
export function openTarget(kind: OpenKind, target: string): void {
  if (kind === 'file') void vscode.window.showTextDocument(vscode.Uri.file(path.join(target, 'SKILL.md')));
  else if (kind === 'folder') void vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(target));
  else if (kind === 'copy') void vscode.env.clipboard.writeText(target);
  else void vscode.env.openExternal(vscode.Uri.parse(target));
}

export class SkillsPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private closed: (() => void)[] = [];

  constructor(private readonly extensionUri: vscode.Uri, private readonly deps: Omit<PanelDeps, 'post'>, private readonly lang: Lang) {}

  onClose(cb: () => void): void {
    this.closed.push(cb);
  }

  open(start: Screen = 'installed'): void {
    if (this.panel) {
      this.panel.reveal();
      if (start === 'install') void this.panel.webview.postMessage({ type: 'install' } satisfies OutMessage);
      return;
    }
    const dist = vscode.Uri.joinPath(this.extensionUri, 'dist');
    const panel = (this.panel = vscode.window.createWebviewPanel('claudeSkills.panel', t(this.lang, 'panelTitle'), vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [dist],
    }));
    panel.iconPath = vscode.Uri.joinPath(this.extensionUri, 'media', 'icon.png');
    const w = panel.webview;
    w.html = buildHtml({
      scriptUri: w.asWebviewUri(vscode.Uri.joinPath(dist, 'webview.js')).toString(),
      styleUri: w.asWebviewUri(vscode.Uri.joinPath(dist, 'webview.css')).toString(),
      cspSource: w.cspSource,
      nonce: nonce(),
      lang: this.lang,
      start,
    });
    const deps: PanelDeps = { ...this.deps, post: (m) => void w.postMessage(m) };
    w.onDidReceiveMessage((m: InMessage) => void handleMessage(m, deps));
    panel.onDidDispose(() => {
      this.panel = undefined;
      for (const cb of this.closed) cb();
    });
  }

  /** Something changed outside the page (a refresh): reload it. */
  changed(): void {
    void this.panel?.webview.postMessage({ type: 'changed' } satisfies OutMessage);
  }

  dispose(): void {
    this.panel?.dispose();
  }
}
