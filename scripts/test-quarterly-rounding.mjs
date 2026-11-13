import test from 'node:test';
import assert from 'node:assert/strict';
import { formatQuarterlyFinal } from '../src/quarterlyFinalGrade.mjs';

test('keeps one decimal by default and rounds only when requested', () => {
  assert.equal(formatQuarterlyFinal(8.26), '8.3');
  assert.equal(formatQuarterlyFinal(8.26, true), '8');
  assert.equal(formatQuarterlyFinal(8.75, true), '9');
});

test('preserves empty and non-numeric values', () => {
  assert.equal(formatQuarterlyFinal(null), '—');
  assert.equal(formatQuarterlyFinal('  '), '  ');
  assert.equal(formatQuarterlyFinal('NP'), 'NP');
});
