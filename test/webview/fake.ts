// A bridge that answers from fixtures and records what the page asked for.
import type { Bridge } from '../../webview/bridge';

export function fakeBridge(answers: Record<string, unknown | ((p: unknown) => unknown)>) {
  const calls: [string, unknown][] = [];
  const ops: unknown[] = [];
  const opened: [string, string][] = [];
  const bridge: Bridge = {
    call: async <T>(m: string, p?: unknown) => {
      calls.push([m, p]);
      const a = answers[m];
      if (a instanceof Error) throw a;
      return (typeof a === 'function' ? (a as (p: unknown) => unknown)(p) : a) as T;
    },
    op: async (req) => { ops.push(req); return true; },
    open: (k, t) => { opened.push([k, t]); },
    pickFolder: async () => '/home/u/my-skill',
  };
  return { bridge, calls, ops, opened };
}

export const flush = () => new Promise((r) => setTimeout(r, 0));
