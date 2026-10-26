import type { TruthTable } from './truthTable';

export interface Literal { name: string; negated: boolean }
export type Expr =
  | { kind: 'const'; value: 0 | 1 }
  | { kind: 'sop'; terms: Literal[][] } // OR of ANDs
  | { kind: 'undefined' }; // the output is undefined for some inputs

/** An implicant covers every minterm that matches `value` outside the `mask` bits (mask = "don't care"). */
interface Implicant { value: number; mask: number }

/** Quine-McCluskey: merge terms that differ in one bit until nothing merges; what never merges is prime. */
function primeImplicants(minterms: number[]): Implicant[] {
  let current = new Map<string, Implicant>(minterms.map((m) => [`${m}:0`, { value: m, mask: 0 }]));
  const primes: Implicant[] = [];
  while (current.size) {
    const next = new Map<string, Implicant>();
    const used = new Set<string>();
    const byMask = new Map<number, [string, Implicant][]>();
    for (const [key, imp] of current) {
      const group = byMask.get(imp.mask);
      if (group) group.push([key, imp]);
      else byMask.set(imp.mask, [[key, imp]]);
    }
    for (const group of byMask.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const diff = group[i][1].value ^ group[j][1].value;
          if (diff && (diff & (diff - 1)) === 0) {
            const mask = group[i][1].mask | diff;
            const value = group[i][1].value & ~diff;
            next.set(`${value}:${mask}`, { value, mask });
            used.add(group[i][0]);
            used.add(group[j][0]);
          }
        }
      }
    }
    for (const [key, imp] of current) if (!used.has(key)) primes.push(imp);
    current = next;
  }
  return primes;
}

const popcount = (n: number) => {
  let c = 0;
  for (; n; n &= n - 1) c++;
  return c;
};

/** Essential primes first, then greedily the prime that covers the most uncovered minterms. */
function pickCover(primes: Implicant[], minterms: number[]): Implicant[] {
  const covers = (p: Implicant, m: number) => (m & ~p.mask) === p.value;
  const chosen = new Set<Implicant>();
  for (const m of minterms) {
    const ps = primes.filter((p) => covers(p, m));
    if (ps.length === 1) chosen.add(ps[0]);
  }
  const left = new Set(minterms.filter((m) => ![...chosen].some((p) => covers(p, m))));
  while (left.size) {
    let best = primes[0];
    let bestGain = -1;
    for (const p of primes) {
      if (chosen.has(p)) continue;
      const gain = [...left].filter((m) => covers(p, m)).length;
      if (gain > bestGain || (gain === bestGain && popcount(p.mask) > popcount(best.mask))) {
        best = p;
        bestGain = gain;
      }
    }
    chosen.add(best);
    for (const m of [...left]) if (covers(best, m)) left.delete(m);
  }
  return [...chosen];
}

/** Simplified sum-of-products for one output column. */
export function toSop(table: TruthTable, outputIndex: number): Expr {
  const n = table.inputs.length;
  const column = table.rows.map((r) => r.outputs[outputIndex]);
  if (column.includes('X')) return { kind: 'undefined' };
  const minterms = column.flatMap((v, i) => (v === 1 ? [i] : []));
  if (minterms.length === 0) return { kind: 'const', value: 0 };
  if (minterms.length === table.rows.length) return { kind: 'const', value: 1 };

  // Order terms like a textbook: by the first variable they use, complemented before plain.
  const keyOf = (imp: Implicant) =>
    table.inputs.map((_, i) => {
      const bit = 1 << (n - 1 - i);
      return imp.mask & bit ? 2 : imp.value & bit ? 1 : 0;
    });
  const compare = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };

  const terms = pickCover(primeImplicants(minterms), minterms)
    .map((imp) => ({ imp, key: keyOf(imp) }))
    .sort((a, b) => compare(a.key, b.key))
    .map(({ imp }) =>
      table.inputs.flatMap((p, i): Literal[] => {
        const bit = 1 << (n - 1 - i);
        return imp.mask & bit ? [] : [{ name: p.name, negated: !(imp.value & bit) }];
      }),
    );
  return { kind: 'sop', terms };
}

/** Plain text, e.g. A'B + AB' (a prime marks a complemented variable). */
export function exprToString(e: Expr): string {
  if (e.kind === 'const') return String(e.value);
  if (e.kind === 'undefined') return 'undefined';
  return e.terms.map((t) => t.map((l) => l.name + (l.negated ? "'" : '')).join('')).join(' + ');
}
