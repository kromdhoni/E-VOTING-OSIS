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
});
