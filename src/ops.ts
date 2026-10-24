// Every change goes through here: `skills:plan` says what will happen, the user confirms, `skills:apply`
// does it, and the message after offers to undo it. The webview never applies anything itself.
import type { Lang } from '@bumeter/vscode-kit/format';
import { t } from './strings';
import type { JournalEntry, OpRequest, Plan, SkillRow } from './types';

export interface Action { op: string; target: string; kind: 'toggle' | 'uninstall' }

/** What can be done to a row, the same rules as the desktop app. */
export function actionsFor(r: SkillRow): Action[] {
  const e = r.entry;
  if (!e.managed) return [];
  if (e.source.kind === 'plugin') {
    return [{ op: e.state === 'enabled' ? 'plugin_disable' : 'plugin_enable', target: e.source.plugin, kind: 'toggle' }];
  }
  return [
    { op: e.state === 'enabled' ? 'disable' : 'enable', target: e.name, kind: 'toggle' },
    { op: 'uninstall', target: e.name, kind: 'uninstall' },
  ];
}

export interface OpUi {
  /** A modal with the plan's description; true when the user pressed `button`. */
  confirm(detail: string, button: string): Promise<boolean>;
  /** The change is made; `undo` takes it back. */
  done(message: string, undo: () => Promise<void>): void;
  error(message: string): void;
}

type Rpc = { call<T>(method: string, params?: unknown): Promise<T> };

const button = (op: string, lang: Lang) =>
  t(lang, op.startsWith('install') ? 'confirmInstall' : op.endsWith('enable') ? 'confirmEnable' : op.endsWith('disable') ? 'confirmDisable' : 'confirmUninstall');

/** True when the change was applied. */
export async function runOp(rpc: Rpc, req: OpRequest, ui: OpUi, lang: Lang): Promise<boolean> {
  let plan: Plan;
  try {
    plan = await rpc.call<Plan>('skills:plan', req);
  } catch (e) {
    ui.error((e as Error).message);
    return false;
  }
  if (!(await ui.confirm(plan.description, button(req.op, lang)))) return false;
  try {
    const entry = await rpc.call<JournalEntry>('skills:apply', { id: plan.id });
    ui.done(t(lang, 'done', { what: plan.description }), async () => {
      await rpc.call('skills:undo', { id: entry.id, tool: req.tool ?? 'claude_code' });
    });
    return true;
  } catch (e) {
    ui.error((e as Error).message);
    return false;
  }
}
