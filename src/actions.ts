// What can be done to an installed skill. No imports beyond types: the webview uses it too.
import type { SkillRow } from './types';

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
