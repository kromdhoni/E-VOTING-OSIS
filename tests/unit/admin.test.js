import { describe, it, expect, vi, beforeEach } from 'vitest';
describe('admin', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
  it('importVoters parses and inserts', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error:null });
    vi.doMock('../../src/js/supabase.js', () => ({ supabase:{ from:()=>({insert:mockInsert}), rpc:vi.fn() } }));
    const { importVoters } = await import('../../src/js/admin.js');
    const res = await importVoters('nis,nama,kelas\n200,Siti,XI-1');
    expect(mockInsert).toHaveBeenCalled();
    expect(res.count).toBe(1);
  });
  it('toggleElection calls update', async () => {
    const mockUpdate = vi.fn().mockReturnValue({ eq:vi.fn().mockResolvedValue({error:null}) });
    vi.doMock('../../src/js/supabase.js', () => ({ supabase:{ from:()=>({update:mockUpdate}) } }));
    const { toggleElection } = await import('../../src/js/admin.js');
    await expect(toggleElection(true)).resolves.toBeDefined();
  });
  it('resetVotingResults deletes votes and clears voter flags', async () => {
    const mockNeq = vi.fn().mockResolvedValue({ error:null });
    const mockEq = vi.fn().mockResolvedValue({ error:null });
    const mockInsert = vi.fn().mockResolvedValue({ error:null });
    vi.doMock('../../src/js/supabase.js', () => ({ supabase:{ from:(table)=>{
      if (table === 'votes') return { delete: vi.fn().mockReturnValue({ neq: mockNeq }) };
      if (table === 'voters') return { update: vi.fn().mockReturnValue({ eq: mockEq }) };
      return { insert: mockInsert };
    } } }));
    const { resetVotingResults } = await import('../../src/js/admin.js');
    const res = await resetVotingResults();
    expect(res.ok).toBe(true);
    expect(mockNeq).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });
  it('filterVoters filters by status, kelas, and query', async () => {
    vi.doMock('../../src/js/supabase.js', () => ({ supabase:{ from: vi.fn() } }));
    const { filterVoters } = await import('../../src/js/admin.js');
    const voters = [
      { nis:'1', nama:'Andi', kelas:'X-1', has_voted:true },
      { nis:'2', nama:'Budi', kelas:'X-2', has_voted:false },
    ];
    expect(filterVoters(voters, { q:'', status:'voted', kelas:'' }).length).toBe(1);
    expect(filterVoters(voters, { q:'', status:'all', kelas:'X-2' })[0].nis).toBe('2');
    expect(filterVoters(voters, { q:'budi', status:'all', kelas:'' }).length).toBe(1);
  });
});
