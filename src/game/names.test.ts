import { describe, expect, it } from 'vitest';
import { cleanName } from './names';

describe('cleanName', () => {
  it('removes characters that hide or flip text on the projector', () => {
    expect(cleanName('‮abc')).toBe('abc');
    expect(cleanName('An​a')).toBe('Ana');
    expect(cleanName('a\u0000b\u0007c')).toBe('abc');
  });
  it('keeps accents, trims and collapses spaces, max 16 chars', () => {
    expect(cleanName('  José   María ')).toBe('José María');
    expect(cleanName('x'.repeat(30))).toHaveLength(16);
  });
});
