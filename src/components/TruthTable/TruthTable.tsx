import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { MAX_INPUTS } from '../../engine/truthTable';
import { useTruthTable } from '../../hooks/useTruthTable';
import { useCircuitStore } from '../../store/circuitStore';
import { IconButton } from '../shared/IconButton';
import { spring } from '../shared/motion';
import { BooleanExpr } from './BooleanExpr';
import { ExportBar } from './ExportBar';
import { TruthTableGrid } from './TruthTableGrid';

const Note = ({ children }: { children: ReactNode }) => (
  <p className="m-0 px-4 py-4 text-sm italic leading-relaxed text-fg/60">{children}</p>
);

export function TruthTable() {
  const view = useTruthTable();
  const { table } = view;

  // Clicking a row sets the input switches to that combination.
  const pick = (rowIndex: number) => {
    if (!table) return;
    const row = table.rows[rowIndex];
    useCircuitStore
      .getState()
      .setInputs(Object.fromEntries(table.inputs.map((p, i): [string, 0 | 1] => [p.id, row.inputs[i]])));
  };

  let body: ReactNode;
  if (view.mode === 'empty') {
    body = <Note>Place at least one Input and one Output on the canvas to see the table.</Note>;
  } else if (view.mode === 'dynamic') {
    body = <Note>This circuit has a clock or memory, so its outputs depend on what happened before. A truth table doesn’t apply.</Note>;
  } else if (view.mode === 'too-large') {
    body = <Note>This circuit has {view.inputCount} inputs. The table supports up to {MAX_INPUTS}.</Note>;
  } else if (!table) {
    body = (
      <div className="px-4 py-4">
        <p className="m-0 text-sm leading-relaxed text-fg/70">
          {view.inputCount} inputs make {2 ** view.inputCount} rows, so this table is built when you ask for it.
        </p>
        <IconButton label="Generate the truth table" onClick={view.generate} className="mt-3">
          Generate table
        </IconButton>
      </div>
    );
  } else {
    body = (
      <>
        {view.stale && (
          <div className="mx-3 mt-3 flex items-center justify-between gap-2 rounded-lg border border-wire-undef/40 bg-wire-undef/10 px-3 py-2 text-xs">
            <span>The circuit changed since this table was made.</span>
            <IconButton label="Regenerate the truth table" onClick={view.generate}>
              Regenerate
            </IconButton>
          </div>
        )}
        <TruthTableGrid table={table} currentRow={view.currentRow} onPick={pick} />
        <BooleanExpr table={table} />
        <ExportBar table={table} />
      </>
    );
  }

  return (
    <aside aria-label="Truth table" className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="m-0 text-sm font-semibold tracking-tight">Truth table</h2>
        {(view.mode === 'auto' || view.mode === 'manual') && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-fg/70">
            {view.mode === 'auto' ? 'Auto' : 'Manual'}
          </span>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <motion.div
          key={`${view.mode}-${table ? 'table' : 'none'}`}
          initial={{ opacity: 0, y: 6, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
          transition={spring}
        >
          {body}
        </motion.div>
      </div>
    </aside>
  );
}
