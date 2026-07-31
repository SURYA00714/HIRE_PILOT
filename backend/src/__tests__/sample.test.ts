import { describe, it, expect } from 'vitest';

describe('Sample Test Suite', () => {
  it('should pass a basic math test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should be able to parse JSON', () => {
    const jsonStr = '{"status": "success"}';
    const obj = JSON.parse(jsonStr);
    expect(obj.status).toBe('success');
  });
});
