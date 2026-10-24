// Claude Code Skills Manager (by Bumeter): a status bar button with the number of skills, and a tab to
// see, turn on/off, remove and install Claude Code (and Kiro) skills. It bundles its own `bum`; every
// change is planned by `bum`, confirmed by the user, and can be undone.
import * as vscode from 'vscode';
import { ensureExecutable, findBum, langOf, RpcClient } from '@bumeter/vscode-kit';
import type { Lang } from '@bumeter/vscode-kit';
import { SkillsButton } from './button';
import { runOp } from './ops';
import type { OpUi } from './ops';
import { openTarget, SkillsPanel } from './panel';
import { t } from './strings';

let rpc: RpcClient | undefined;

function opUi(lang: Lang, after: () => void): OpUi {
  return {
    confirm: async (detail, button) => (await vscode.window.showWarningMessage(detail, { modal: true }, button)) === button,
    done: (message, undo) => {
      void vscode.window.showInformationMessage(message, t(lang, 'undo')).then(async (pick) => {
        if (pick !== t(lang, 'undo')) return;
        try {
          await undo();
          void vscode.window.showInformationMessage(t(lang, 'undone'));
        } catch (e) {
          void vscode.window.showErrorMessage(`Skill Manager: ${(e as Error).message}`);
        }
        after();
      });
    },
    error: (m) => void vscode.window.showErrorMessage(`Skill Manager: ${m}`),
  };
}

export function activate(ctx: vscode.ExtensionContext): void {
  const lang = langOf(vscode.env.language);
  const bin = findBum({ setting: vscode.workspace.getConfiguration('claudeSkills').get<string>('binaryPath', ''), extensionPath: ctx.extensionPath });
  if (!bin) {
    const item = vscode.window.createStatusBarItem('claudeSkills.status', vscode.StatusBarAlignment.Right, 99);
    item.text = '$(book) Skill Manager $(warning)';
    item.tooltip = t(lang, 'noBum');
    item.command = { title: t(lang, 'openSettings'), command: 'workbench.action.openSettings', arguments: ['claudeSkills.binaryPath'] };
    item.show();
    const missing = () => void vscode.window.showErrorMessage(t(lang, 'noBum'), t(lang, 'openSettings')).then((p) => {
      if (p) void vscode.commands.executeCommand('workbench.action.openSettings', 'claudeSkills.binaryPath');
    });
    ctx.subscriptions.push(item, ...['claudeSkills.open', 'claudeSkills.install', 'claudeSkills.refresh'].map((c) => vscode.commands.registerCommand(c, missing)));
    return;
  }
  if (bin.startsWith(ctx.extensionPath)) ensureExecutable(bin);
  const c = (rpc = RpcClient.forBinary(bin));
  const button = new SkillsButton(c, lang, 'claudeSkills.open');
  const refreshAll = () => {
    void button.refresh();
    panel.changed();
  };
  const ui = opUi(lang, refreshAll);
  const panel = new SkillsPanel(ctx.extensionUri, {
    rpc: c,
    runOp: async (req) => {
      const applied = await runOp(c, req, ui, lang);
      if (applied) void button.refresh();
      return applied;
    },
    open: openTarget,
    pickFolder: async () => (await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false, openLabel: t(lang, 'pickFolder') }))?.[0]?.fsPath,
  }, lang);
  panel.onClose(() => void button.refresh());

  ctx.subscriptions.push(
    button,
    panel,
    { dispose: () => rpc?.dispose() },
    vscode.commands.registerCommand('claudeSkills.open', () => panel.open('installed')),
    vscode.commands.registerCommand('claudeSkills.install', () => panel.open('install')),
    vscode.commands.registerCommand('claudeSkills.refresh', refreshAll),
    vscode.window.onDidChangeWindowState((s) => { if (s.focused) void button.refresh(); }),
    { dispose: c.onEvent((e) => { if (e.event === 'host' || e.event === 'data_changed') void button.refresh(); }) },
  );
  void button.refresh();
}

export function deactivate(): void {
  rpc?.dispose();
  rpc = undefined;
}
