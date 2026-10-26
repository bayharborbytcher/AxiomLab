import { useMemo } from 'react';
import { toSop } from '../../engine/booleanExpr';
import type { Expr } from '../../engine/booleanExpr';
import type { TruthTable } from '../../engine/truthTable';

function Expression({ expr }: { expr: Expr }) {
  if (expr.kind === 'const') return <span className="font-semibold">{expr.value}</span>;
  if (expr.kind === 'undefined') return <span className="italic text-wire-undef">undefined for some inputs</span>;
  return (
    <>
      {expr.terms.map((term, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 text-fg/50">+</span>}
          {term.map((lit) => (
            // An overbar marks a complemented variable. The small gap keeps neighbouring bars apart.
            <span
              key={lit.name}
              className={'mr-[0.14em] font-semibold italic ' + (lit.negated ? 'overline decoration-[1.5px]' : '')}
            >
              {lit.name}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}

/** Simplified sum-of-products expression for each output. */
export function BooleanExpr({ table }: { table: TruthTable }) {
  const exprs = useMemo(() => table.outputs.map((_, i) => toSop(table, i)), [table]);

  return (
    <section aria-label="Boolean expressions" className="border-t border-border px-4 py-3">
      <h3 className="m-0 mb-2 text-xs font-semibold tracking-tight text-fg/70">Simplified expression</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {table.outputs.map((out, i) => (
          <li key={out.id} className="break-words text-sm leading-relaxed">
            <span className="font-semibold italic">{out.name}</span>
            <span className="mx-1.5 text-fg/50">=</span>
            <Expression expr={exprs[i]} />
          </li>
        ))}
      </ul>
    </section>
  );
}
