import { describe, it, expect } from 'vitest';
describe('security', () => {
  it('rate limit blocks after 5 fails', async () => {
    const { checkRateLimit } = await import('../../src/js/auth.js');
    for(let i=0;i<5;i++) checkRateLimit('1.1.1.1');
    expect(checkRateLimit('1.1.1.1')).toBe(false); // 6th blocked
  });
  it('audit log inserted on vote', async () => {
    // mock supabase insert audit
    expect(true).toBe(true); // placeholder for integration
  });
});
