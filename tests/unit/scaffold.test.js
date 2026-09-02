// tests/unit/scaffold.test.js
import { describe, it, expect } from 'vitest';
describe('supabase client', () => {
  it('exports supabase with correct URL from env', async () => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
    const { supabase } = await import('../../src/js/supabase.js');
    expect(supabase).toBeDefined();
    expect(supabase.supabaseUrl).toBe('https://test.supabase.co');
  });
});
