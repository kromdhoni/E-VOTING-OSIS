import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('results', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getResults returns aggregated counts with metadata', async () => {
    const mockVotes = [{ candidate_id: 1, created_at: '2026-09-02T10:00:00Z' }, { candidate_id: 1, created_at: '2026-09-02T10:01:00Z' }, { candidate_id: 2, created_at: '2026-09-02T10:02:00Z' }];
    const mockCands = [
      { id: 1, nomor_urut: 1, nama_ketua: 'A', nama_wakil: 'B', visi: 'Visi A' },
      { id: 2, nomor_urut: 2, nama_ketua: 'C', nama_wakil: 'D', visi: 'Visi C' }
    ];
    vi.doMock('../../src/js/supabase.js', () => ({
      supabase: {
        from: (table) => {
          if (table === 'election_config') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { is_open: false, start_at: '2026-09-02T09:00:00Z', end_at: '2026-09-02T11:00:00Z' } })
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
    expect(r.total).toBe(3);
    expect(r.results.length).toBe(2);
    const c1 = r.results.find(x => x.candidate_id === 1);
    expect(c1.count).toBe(2);
    expect(c1.percent).toBe(67);
    expect(c1.nama).toBe('A & B');
    const c2 = r.results.find(x => x.candidate_id === 2);
    expect(c2.count).toBe(1);
    expect(c2.percent).toBe(33);
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

  it('exportText returns formatted string', async () => {
    vi.doMock('../../src/js/supabase.js', () => ({
      supabase: { from: vi.fn() }
    }));
    const { exportText } = await import('../../src/js/results.js');
    const text = exportText({
      results: [
        { candidate_id: 1, nomor: 1, nama: 'A & B', count: 5, percent: 63, visi: 'Visi A' },
        { candidate_id: 2, nomor: 2, nama: 'C & D', count: 3, percent: 37, visi: '' }
      ],
      total: 8,
      startAt: '2026-09-02T09:00:00Z',
      endAt: '2026-09-02T11:00:00Z'
    });
    expect(text).toContain('PEMENANG');
    expect(text).toContain('Paslon 01');
    expect(text).toContain('Total Suara');
    expect(typeof text).toBe('string');
  });
});
