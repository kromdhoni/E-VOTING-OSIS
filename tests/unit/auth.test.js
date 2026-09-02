import { describe, it, expect, vi } from 'vitest';
describe('auth', () => {
  it('loginVoter rejects has_voted=true', async () => {
    const mock = { from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data:{nis:'123',has_voted:true,token_hash:'hash'}}) }) }) }) };
    vi.doMock('../../src/js/supabase.js', () => ({ supabase: mock }));
    const { loginVoter } = await import('../../src/js/auth.js');
    const res = await loginVoter('123','000000');
    expect(res.ok).toBe(false);
    expect(res.msg).toMatch(/sudah memilih/i);
  });
});
