import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('results', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getResults returns aggregated counts', async () => {
    const mockVotes = [{ candidate_id: 1 }, { candidate_id: 1 }, { candidate_id: 2 }];
    const mockCands = [
      { id: 1, nomor_urut: 1, nama_ketua: 'A', nama_wakil: 'B' },
      { id: 2, nomor_urut: 2, nama_ketua: 'C', nama_wakil: 'D' }
    ];
    vi.doMock('../../src/js/supabase.js', () => ({
      supabase: {
        from: (table) => {
          if (table === 'election_config') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { is_open: false } })
                })
              })
            };
          }
          if (table === 'votes') {
            return { select: vi.fn().mockResolvedValue({ data: mockVotes }) };
          }
          if (table === 'candidates') {
            return { select: vi.fn().mockResolvedValue({ data: mockCands }) };
          }
          return { select: vi.fn().mockResolvedValue({ data: [] }) };
        }
      }
    }));
    const { getResults } = await import('../../src/js/results.js');
    const r = await getResults();
    expect(r.find(x => x.candidate_id === 1).count).toBe(2);
    expect(r.find(x => x.candidate_id === 2).count).toBe(1);
    const c1 = r.find(x => x.candidate_id === 1);
    expect(c1.percent).toBe(67);
    expect(c1.nomor).toBe(1);
    expect(c1.nama).toBe('A & B');
  });

  it('getResults throws if is_open true', async () => {
    vi.doMock('../../src/js/supabase.js', () => ({
      supabase: {
        from: (table) => {
          if (table === 'election_config') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { is_open: true } })
                })
              })
            };
          }
          return { select: vi.fn().mockResolvedValue({ data: [] }) };
        }
      }
    }));
    const { getResults } = await import('../../src/js/results.js');
    await expect(getResults()).rejects.toThrow(/terkunci/i);
  });

  it('exportPDF generates blob', async () => {
    vi.doMock('../../src/js/supabase.js', () => ({
      supabase: { from: vi.fn() }
    }));
    const { exportPDF } = await import('../../src/js/results.js');
    const blob = await exportPDF([{ candidate_id: 1, nomor: 1, nama: 'A & B', count: 2, percent: 66 }]);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });
});
