// The page's side of the bridge: requests carry an id, the extension answers with a `result`.
import type { OpRequest } from '../src/types';

declare function acquireVsCodeApi(): { postMessage(m: unknown): void };

type Listener = (m: { type: string }) => void;
let api: { postMessage(m: unknown): void } | undefined;
let next = 1;
const waiting = new Map<number, { ok: (v: unknown) => void; fail: (e: Error) => void }>();
const listeners = new Map<string, Listener[]>();

function post(m: unknown): void {
  api ??= acquireVsCodeApi();
  api.postMessage(m);
}

function request<T>(m: Record<string, unknown>): Promise<T> {
  const id = next++;
  return new Promise<T>((ok, fail) => {
    waiting.set(id, { ok: ok as (v: unknown) => void, fail });
    post({ ...m, id });
  });
}

window.addEventListener('message', (e: MessageEvent) => {
  const m = e.data as { type: string; id?: number; result?: unknown; error?: string };
  if (m.type === 'result' && m.id != null) {
    const w = waiting.get(m.id);
    waiting.delete(m.id);
    if (m.error != null) w?.fail(new Error(m.error));
    else w?.ok(m.result);
    return;
  }
  for (const cb of listeners.get(m.type) ?? []) cb(m);
});

export interface Bridge {
  call<T>(method: string, params?: unknown): Promise<T>;
  /** True when the user confirmed and the change was applied. */
  op(req: OpRequest): Promise<boolean>;
  open(kind: 'file' | 'folder' | 'copy' | 'url', target: string): void;
  pickFolder(): Promise<string | undefined>;
}

export const bridge: Bridge = {
  call: (method, params) => request({ type: 'call', method, params }),
  op: (req) => request({ type: 'op', req }),
  open: (kind, target) => post({ type: 'open', kind, target }),
  pickFolder: () => request({ type: 'pickFolder' }),
};

export function onMessage(type: string, cb: Listener): void {
  listeners.set(type, [...(listeners.get(type) ?? []), cb]);
}
