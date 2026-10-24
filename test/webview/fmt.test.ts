import { describe, expect, it } from 'vitest';
import { ago, compact } from '../../webview/fmt';
import { setLang } from '../../webview/strings';

describe('fmt', () => {
  it('compact numbers', () => {
    expect([compact(950), compact(12_400), compact(3_000), compact(216_041), compact(3_420_000)]).toEqual(['950', '12.4K', '3K', '216K', '3.4M']);
  });
  it('how long ago, in both languages', () => {
    const now = new Date(2026, 9, 24, 15, 0).getTime();
    const at = (d: number) => new Date(2026, 9, d, 9, 0).toISOString();
    setLang('en');
    expect([ago(at(24), now), ago(at(23), now), ago(at(21), now), ago(null, now)]).toEqual(['today', 'yesterday', '3 days', 'never']);
    setLang('vi');
    expect([ago(at(23), now), ago(at(14), now), ago(null, now)]).toEqual(['hôm qua', '10 ngày', 'chưa']);
  });
});
