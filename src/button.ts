// The status bar button: "Skill Manager" and how many skills are installed; click opens the Skill Manager tab.
import * as vscode from 'vscode';
import type { Lang } from '@bumeter/vscode-kit/format';
import type { RpcClient } from '@bumeter/vscode-kit/rpc';
import { t } from './strings';
import type { Counts } from './types';

/** Same in every language: it is the product's name. */
const BRAND = 'Skill Manager';

export interface ButtonView { text: string; tooltip: string; level: 'normal' | 'error' }

const LINKS = (lang: Lang) => `[${t(lang, 'open')}](command:claudeSkills.open) · [${t(lang, 'refresh')}](command:claudeSkills.refresh)`;

/** What the button shows. Pure, for tests. */
export function buttonView(c: Counts | null, err: string | null, lang: Lang): ButtonView {
  if (err) return { text: `$(book) ${BRAND} $(error)`, tooltip: `**${t(lang, 'error')}**: ${err}\n\n${LINKS(lang)}`, level: 'error' };
  if (!c) return { text: `$(sync~spin) ${BRAND}`, tooltip: t(lang, 'tooltipTitle'), level: 'normal' };
  const n = t(lang, c.total === 1 ? 'skillsOne' : 'skills', { n: c.total });
  const lines = [`**${t(lang, 'tooltipTitle')}** · ${n}`, t(lang, 'counts', { cc: c.claude_code, kiro: c.kiro }), `_${t(lang, 'countsNote')}_`, LINKS(lang)];
  return { text: `$(book) ${BRAND} · ${c.total}`, tooltip: lines.join('\n\n'), level: 'normal' };
}

export class SkillsButton implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly timer: ReturnType<typeof setInterval>;
  private busy = false;

  constructor(private readonly rpc: Pick<RpcClient, 'call'>, private readonly lang: Lang, click: string, pollMs = 60_000) {
    this.item = vscode.window.createStatusBarItem('claudeSkills.status', vscode.StatusBarAlignment.Right, 99);
    this.item.name = 'Claude Code Skill Manager';
    this.item.command = click;
    this.show(buttonView(null, null, lang));
    this.timer = setInterval(() => void this.refresh(), pollMs);
  }

  async refresh(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      this.show(buttonView(await this.rpc.call<Counts>('skills:count'), null, this.lang));
    } catch (e) {
      this.show(buttonView(null, (e as Error).message, this.lang));
    } finally {
      this.busy = false;
    }
  }

  private show(v: ButtonView): void {
    this.item.text = v.text;
    const md = new vscode.MarkdownString(v.tooltip, true);
    md.isTrusted = { enabledCommands: ['claudeSkills.open', 'claudeSkills.refresh'] };
    this.item.tooltip = md;
    this.item.backgroundColor = v.level === 'error' ? new vscode.ThemeColor('statusBarItem.errorBackground') : undefined;
    this.item.show();
  }

  dispose(): void {
    clearInterval(this.timer);
    this.item.dispose();
  }
}
