import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('laporan', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('buildStatsHTML shows turnout numbers', async () => {
    vi.doMock('../../src/js/supabase.js', () => ({ supabase: { from: vi.fn() } }));
    vi.doMock('../../src/js/results.js', () => ({ getResults: vi.fn() }));
    const { buildStatsHTML } = await import('../../src/js/laporan.js');
    const html = buildStatsHTML({ totalVoters: 346, totalVotes: 200 });
    expect(html).toContain('346');
    expect(html).toContain('200');
    expect(html).toContain('58%');
    expect(html).toContain('146');
  });

  it('buildWinnerHTML empty when no votes', async () => {
    vi.doMock('../../src/js/supabase.js', () => ({ supabase: { from: vi.fn() } }));
    vi.doMock('../../src/js/results.js', () => ({ getResults: vi.fn() }));
    const { buildWinnerHTML } = await import('../../src/js/laporan.js');
    expect(buildWinnerHTML(null)).toBe('');
    expect(buildWinnerHTML({ count: 0 })).toBe('');
  });

  it('buildKelasTableHTML renders per-kelas rows', async () => {
    vi.doMock('../../src/js/supabase.js', () => ({ supabase: { from: vi.fn() } }));
    vi.doMock('../../src/js/results.js', () => ({ getResults: vi.fn() }));
    const { buildKelasTableHTML } = await import('../../src/js/laporan.js');
    const html = buildKelasTableHTML({ 'X TJKT': { total: 30, voted: 15 }, 'GURU': { total: 25, voted: 25 } });
    expect(html).toContain('X TJKT');
    expect(html).toContain('GURU');
    expect(html).toContain('50%');
    expect(html).toContain('100%');
  });
});
