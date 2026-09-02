import { describe, it, expect } from 'vitest';
import { parseCSV, generateToken } from '../../src/js/utils.js';
describe('utils', () => {
  it('parseCSV parses 2 rows', () => {
    const csv = 'nis,nama,kelas\n123,Budi,XII-1\n124,Ani,XII-2';
    expect(parseCSV(csv)).toEqual([{nis:'123',nama:'Budi',kelas:'XII-1'},{nis:'124',nama:'Ani',kelas:'XII-2'}]);
  });
  it('generateToken returns 6 digits', () => {
    expect(generateToken()).toMatch(/^\d{6}$/);
  });
});
