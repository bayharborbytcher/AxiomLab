import { describe, expect, it } from 'vitest';
import { exprToString, toSop } from '../../engine/booleanExpr';
import type { TruthTable } from '../../engine/truthTable';

/** Build a table straight from a function of the input bits. */
function table(n: number, f: (bits: number[]) => 0 | 1): TruthTable {
  const inputs = Array.from({ length: n }, (_, i) => ({ id: `i${i}`, name: String.fromCharCode(65 + i) }));
  const rows = Array.from({ length: 2 ** n }, (_, r) => {
    const bits = inputs.map((_, i) => (r >> (n - 1 - i)) & 1);
    return { inputs: bits as (0 | 1)[], outputs: [f(bits)] };
  });
  return { inputs, outputs: [{ id: 'o', name: 'Y' }], rows };
}
const sop = (n: number, f: (bits: number[]) => 0 | 1) => exprToString(toSop(table(n, f), 0));

describe('toSop', () => {
  it('XOR', () => expect(sop(2, ([a, b]) => (a ^ b ? 1 : 0))).toBe("A'B + AB'"));
  it('OR simplifies to A + B', () => expect(sop(2, ([a, b]) => (a | b ? 1 : 0))).toBe('A + B'));
  it('AND', () => expect(sop(2, ([a, b]) => (a & b ? 1 : 0))).toBe('AB'));
  it('constants', () => {
    expect(sop(2, () => 0)).toBe('0');
    expect(sop(2, () => 1)).toBe('1');
  });
  it('majority of three has three two-letter terms', () => {
    const s = sop(3, ([a, b, c]) => (a + b + c >= 2 ? 1 : 0));
    expect(s.split(' + ')).toEqual(['AB', 'AC', 'BC']);
  });
  it('ignores an input that does not matter (Y = A)', () => {
    expect(sop(2, ([a]) => (a ? 1 : 0))).toBe('A');
  });
});
