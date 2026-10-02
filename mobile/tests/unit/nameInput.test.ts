import { describe, expect, it } from 'vitest';

import { sanitizeNameInput } from '@/lib/nameInput';

describe('sanitizeNameInput', () => {
  it('drops a full stop left by the double-space shortcut and keeps one trailing space', () => {
    expect(sanitizeNameInput('Rezhina. ')).toBe('Rezhina ');
  });

  it('drops a leading run of spaces', () => {
    expect(sanitizeNameInput('   Ali')).toBe('Ali');
  });

  it('collapses repeated spaces into one', () => {
    expect(sanitizeNameInput('Mary    Ann')).toBe('Mary Ann');
  });

  it('keeps a hyphen and both apostrophes', () => {
    expect(sanitizeNameInput('Jean-Luc')).toBe('Jean-Luc');
    expect(sanitizeNameInput("O'Brien")).toBe("O'Brien");
    expect(sanitizeNameInput('O’Brien')).toBe('O’Brien');
  });

  it('removes digits and other ASCII punctuation', () => {
    expect(sanitizeNameInput('John3@')).toBe('John');
  });

  it('keeps letters from other scripts and the zero-width non-joiner', () => {
    expect(sanitizeNameInput('محمد  علي')).toBe('محمد علي');
    expect(sanitizeNameInput('张伟')).toBe('张伟');
    expect(sanitizeNameInput('Иван')).toBe('Иван');
    expect(sanitizeNameInput('María')).toBe('María');
    expect(sanitizeNameInput('می\u200Cخواهم')).toBe('می\u200Cخواهم');
  });
});
