import { describe, expect, test } from 'vitest';
import { add } from '../src/index';

describe('add function tests', () => {
  test('add(1, 8) returns the value 9', () => {
    expect(add(1, 8)).toBe(9);
  });

  test('add(1, -2) returns the value -1', () => {
    expect(add(1, -2)).toBe(-1);
  });

  test('add(1, 2, 3, 4, 5) returns the value 15', () => {
    expect(add(1, 2, 3, 4, 5)).toBe(15);
  });
});
