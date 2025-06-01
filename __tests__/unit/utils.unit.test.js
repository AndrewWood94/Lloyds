const { toTitleCase } = require('../../utils');

describe('Utility Functions', () => {
  describe('toTitleCase', () => {
    it('should convert a lowercase string to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
    });

    it('should convert an uppercase string to title case', () => {
      expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
    });

    it('should handle strings that are already in title case', () => {
      expect(toTitleCase('Already Title Case')).toBe('Already Title Case');
    });

    it('should handle mixed case strings correctly', () => {
      expect(toTitleCase('hELLo wORLd')).toBe('Hello World');
    });

    it('should handle strings with extra spaces (word boundaries)', () => {
      expect(toTitleCase('  hello   world  ')).toBe('  Hello   World  ');
    });

    it('should handle strings with numbers', () => {
      expect(toTitleCase('the 1st place')).toBe('The 1st Place');
      expect(toTitleCase('version 2.0 update')).toBe('Version 2.0 Update');
    });

    it('should handle strings with punctuation', () => {
      expect(toTitleCase("it's a test-string!")).toBe("It's A Test-string!");
    });

    it('should return an empty string if input is empty', () => {
      expect(toTitleCase('')).toBe('');
    });

    it('should return null if input is null', () => {
      expect(toTitleCase(null)).toBeNull();
    });

    it('should return undefined if input is undefined', () => {
      expect(toTitleCase(undefined)).toBeUndefined();
    });

    it('should handle single word strings', () => {
      expect(toTitleCase('word')).toBe('Word');
      expect(toTitleCase('WORD')).toBe('Word');
    });

    it('should convert a number input to string and then title case', () => {
      expect(toTitleCase(123)).toBe('123');
    });

  });
});