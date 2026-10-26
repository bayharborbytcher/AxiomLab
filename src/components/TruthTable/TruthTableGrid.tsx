import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { TruthTable } from '../../engine/truthTable';
import type { PinState } from '../../types/gate';

interface TruthTableGridProps {
  table: TruthTable;
  currentRow: number;
  onPick: (row: number) => void;
}

const outputClass = (v: PinState) =>
  v === 1 ? 'font-bold text-wire-high' : v === 0 ? 'font-bold text-fg/45' : 'font-bold text-wire-undef';

/** Seconds the pointer takes to glide to another row. */
const TRAVEL = 0.42;
/** How soft new rows and columns start (and finish): they arrive out of focus and sharpen as they settle. */
const BLUR = 'blur(10px)';
/** New rows and columns growing in, and existing ones sliding aside, share this spring. */
const GROW: Transition = { type: 'spring', duration: 0.5, bounce: 0 };
/** Rows and columns leaving are a little quicker than arriving. */
const LEAVE: Transition = { type: 'spring', duration: 0.35, bounce: 0 };
/** Seconds between one new row starting to grow and the next. */
const ROW_STAGGER = 0.035;
/** Space between rows, in px. It lives inside each row so it grows and shrinks with the row. */
const ROW_GAP = 2;

/**
 * One row per input combination. The row matching the switches is marked by a pointer that glides from row to row on
 * one spring; click a row to set the switches.
 *
 * Adding or removing an input changes the table's shape. New rows grow in with a short cascade, coming out of a soft
 * blur as they open; rows that go away fold shut and blur out; columns glide aside to make room. Nothing jumps.
 */
export function TruthTableGrid({ table, currentRow, onPick }: TruthTableGridProps) {
  const reduce = !!useReducedMotion();
  // With reduced motion on, rows and columns just fade quickly: no cascade, no blur.
  const grow: Transition = reduce ? { duration: 0.15 } : GROW;
  const leave: Transition = reduce ? { duration: 0.15 } : LEAVE;
  const blur = reduce ? 'blur(0px)' : BLUR;
  const columns = { gridTemplateColumns: `repeat(${table.inputs.length + table.outputs.length}, minmax(2.25rem, 1fr))` };
  const rowCount = table.rows.length;
  // Changes only when columns are added, removed or reordered. Cells re-measure themselves only then.
  const shape = table.inputs.map((p) => p.id).join(',') + '|' + table.outputs.map((p) => p.id).join(',');

  // How many rows there were before this render, so only the new ones get a delay.
  const prevRows = useRef(rowCount);
  const fromRows = prevRows.current;
  useEffect(() => {
    prevRows.current = rowCount;
  }, [rowCount]);

  /* ---------------- The pointer ---------------- */

  const rowEls = useRef<(HTMLButtonElement | null)[]>([]);
  const y = useMotionValue(0);
  const height = useMotionValue(0);
  const opacity = useMotionValue(0);

  useLayoutEffect(() => {
    const row = currentRow >= 0 ? rowEls.current[currentRow] : null;
    const wrap = row?.parentElement;

    // No row matches the switches: the pointer fades away.
    if (!row || !wrap) {
      const fade = animate(opacity, 0, { duration: 0.2 });
      return () => fade.stop();
    }

    const target = wrap.offsetTop;
    height.set(row.offsetHeight);

    // First appearance, or back after having no match: place it, no travel.
    if (opacity.get() < 0.05) {
      y.set(target);
      const fade = animate(opacity, 1, { duration: reduce ? 0.12 : 0.25 });
      return () => fade.stop();
    }

    const distance = target - y.get();
    if (Math.abs(distance) < 0.5) {
      const fade = animate(opacity, 1, { duration: 0.15 });
      return () => fade.stop();
    }

    const controls = [
      animate(y, target, reduce ? { duration: 0.12 } : { type: 'spring', duration: TRAVEL, bounce: 0 }),
      animate(opacity, 1, { duration: reduce ? 0.12 : 0.15 }),
    ];
    return () => controls.forEach((c) => c.stop());
  }, [currentRow, rowCount, reduce, y, height, opacity]);

  /* ---------------- The grid ---------------- */

  return (
    <motion.div layoutScroll className="overflow-x-auto px-3 pb-3 pt-3">
      <div className="min-w-max">
        <div style={columns} className="relative grid px-1 pb-1.5 text-xs">
          <AnimatePresence initial={false} mode="popLayout">
            {table.inputs.map((p) => (
              <motion.span
                key={p.id}
                layout="position"
                layoutDependency={shape}
                initial={{ opacity: 0, scale: 0.85, filter: blur }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
                exit={{ opacity: 0, scale: 0.85, filter: blur }}
                transition={grow}
                className="text-center font-semibold italic"
              >
                {p.name}
              </motion.span>
            ))}
          </AnimatePresence>
          <AnimatePresence initial={false} mode="popLayout">
            {table.outputs.map((p, i) => (
              <motion.span
                key={p.id}
                layout="position"
                layoutDependency={shape}
                initial={{ opacity: 0, scale: 0.85, filter: blur }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
                exit={{ opacity: 0, scale: 0.85, filter: blur }}
                transition={grow}
                className={'text-center font-semibold italic ' + (i === 0 ? 'border-l border-border' : '')}
              >
                {p.name}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        <div className="relative flex flex-col">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 rounded-md bg-white/12"
            style={{ y, height, opacity }}
          />

          <AnimatePresence initial={false}>
            {table.rows.map((row, r) => (
              <motion.div
                key={r}
                initial={{ height: 0, opacity: 0, overflow: 'hidden', filter: blur }}
                animate={{
                  height: 'auto',
                  opacity: 1,
                  filter: 'blur(0px)',
                  transitionEnd: { overflow: 'visible', filter: 'none' }, // overflow so the focus ring is never clipped
                  transition: { ...grow, delay: reduce ? 0 : Math.max(0, r - fromRows) * ROW_STAGGER },
                }}
                exit={{ height: 0, opacity: 0, overflow: 'hidden', filter: blur, transition: leave }}
              >
                <button
                  ref={(el) => {
                    rowEls.current[r] = el;
                  }}
                  type="button"
                  onClick={() => onPick(r)}
                  aria-pressed={r === currentRow}
                  aria-label={`Set inputs to ${row.inputs.join(' ')}`}
                  style={{ ...columns, marginBottom: ROW_GAP }}
                  className={
                    'relative grid w-full rounded-md px-1 py-1 text-sm tabular-nums transition-colors duration-200 ' +
                    (r === currentRow ? '' : 'hover:bg-white/5')
                  }
                >
                  {/* Cells are positioned so they paint above the pointer. Colour changes ease instead of snapping. */}
                  <AnimatePresence initial={false} mode="popLayout">
                    {row.inputs.map((bit, i) => (
                      <motion.span
                        key={table.inputs[i].id}
                        layout="position"
                        layoutDependency={shape}
                        initial={{ opacity: 0, scale: 0.85, filter: blur }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
                        exit={{ opacity: 0, scale: 0.85, filter: blur }}
                        transition={grow}
                        className={'relative text-center transition-colors duration-300 ' + (r === currentRow ? 'text-fg' : 'text-fg/70')}
                      >
                        {bit}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                  <AnimatePresence initial={false} mode="popLayout">
                    {row.outputs.map((v, i) => (
                      <motion.span
                        key={table.outputs[i].id}
                        layout="position"
                        layoutDependency={shape}
                        initial={{ opacity: 0, scale: 0.85, filter: blur }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
                        exit={{ opacity: 0, scale: 0.85, filter: blur }}
                        transition={grow}
                        className={
                          'relative text-center transition-colors duration-300 ' + outputClass(v) + (i === 0 ? ' border-l border-border' : '')
                        }
                      >
                        {v}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
