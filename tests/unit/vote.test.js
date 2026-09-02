import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('castVote', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('calls RPC cast_vote and handles duplicate', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data:{ok:false, msg:'Sudah memilih (duplicate)'}, error:null });
    vi.doMock('../../src/js/supabase.js', () => ({ supabase:{ rpc: mockRpc, from: vi.fn() } }));
    const { castVote } = await import('../../src/js/vote.js');
    const res = await castVote('123', 1);
    expect(mockRpc).toHaveBeenCalledWith('cast_vote', expect.objectContaining({ p_candidate_id:1, p_nis:'123' }));
    expect(res.ok).toBe(false);
  });

  it('loadCandidates returns array', async () => {
    const mockData = [{id:1,nomor_urut:1}];
    const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error:null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.doMock('../../src/js/supabase.js', () => ({ supabase:{ from: mockFrom, rpc: vi.fn() } }));
    const { loadCandidates } = await import('../../src/js/vote.js');
    const result = await loadCandidates();
    expect(result.length).toBe(1);
  });
});
