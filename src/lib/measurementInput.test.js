import { describe, it, expect } from 'vitest';
import { parseWeight, parseCm } from './measurementInput.js';

describe('parseWeight', () => {
  it('reads plain numbers of 100 or more as grams', () => {
    expect(parseWeight('6300')).toEqual({ grams: 6300, fromKg: false });
    expect(parseWeight('6 300')).toEqual({ grams: 6300, fromKg: false });
    expect(parseWeight(3400)).toEqual({ grams: 3400, fromKg: false });
  });

  it('reads small numbers as kilograms, with dot or comma', () => {
    expect(parseWeight('6.3')).toEqual({ grams: 6300, fromKg: true });
    expect(parseWeight('6,35')).toEqual({ grams: 6350, fromKg: true });
    expect(parseWeight('12')).toEqual({ grams: 12000, fromKg: true });
  });

  it('respects explicit units', () => {
    expect(parseWeight('6.3 kg')).toEqual({ grams: 6300, fromKg: true });
    expect(parseWeight('950 g')).toEqual({ grams: 950, fromKg: false });
    expect(parseWeight('95g')).toEqual({ grams: 95, fromKg: false });
  });

  it('treats an empty field as no value and rejects garbage', () => {
    expect(parseWeight('')).toEqual({ grams: null, fromKg: false });
    expect(parseWeight(null)).toEqual({ grams: null, fromKg: false });
    expect(parseWeight('abc')).toBeNull();
    expect(parseWeight('-5')).toBeNull();
    expect(parseWeight('0')).toBeNull();
  });
});

describe('parseCm', () => {
  it('reads dot or comma decimals and an optional unit, rounded to 0.1', () => {
    expect(parseCm('61')).toEqual({ value: 61 });
    expect(parseCm('61,5')).toEqual({ value: 61.5 });
    expect(parseCm('61.54 cm')).toEqual({ value: 61.5 });
  });

  it('treats an empty field as no value and rejects garbage', () => {
    expect(parseCm('')).toEqual({ value: null });
    expect(parseCm('x')).toBeNull();
    expect(parseCm('-1')).toBeNull();
  });
});
