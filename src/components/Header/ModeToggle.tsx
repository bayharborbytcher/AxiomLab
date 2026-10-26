import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { useSelectionStore } from '../../store/selectionStore';
import { useUIStore } from '../../store/uiStore';
import type { Mode } from '../../store/uiStore';
import { Tooltip } from '../shared/Tooltip';

const OPTIONS: { id: Mode; label: string; hint: string }[] = [
  { id: 'edit', label: 'Edit', hint: 'Build the circuit: add, move, wire and remove' },
  { id: 'operate', label: 'Operate', hint: 'Use the circuit: only flip the input switches' },
];

/** Segmented control on a glass capsule. The white thumb glides between the options on one spring; its inset is concentric with the track. */
export function ModeToggle() {
  const mode = useUIStore((s) => s.mode);
  const reduce = useReducedMotion();
  const slide: Transition = reduce ? { duration: 0.12 } : { type: 'spring', duration: 0.45, bounce: 0 };

  const choose = (next: Mode) => {
    if (next === mode) return;
    const ui = useUIStore.getState();
    ui.setMode(next);
    if (next === 'operate') {
      // Leave editing cleanly: drop the selection and any half-drawn wire.
      useSelectionStore.getState().clear();
      ui.setWireDraft(null);
      ui.setHoverPin(null);
    }
  };

  return (
    <div role="radiogroup" aria-label="Mode" className="glass relative flex h-10 items-center rounded-full p-[3px]">
      {OPTIONS.map((o) => {
        const active = o.id === mode;
        return (
          <Tooltip key={o.id} label={o.hint}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(o.id)}
              className="relative h-[32px] rounded-full px-5 text-sm font-semibold"
            >
              {active && <motion.span layoutId="mode-pill" transition={slide} className="absolute inset-0 rounded-full bg-fg" />}
              <motion.span
                className="relative"
                initial={false}
                animate={{ color: active ? '#000000' : 'rgba(245, 245, 247, 0.7)' }}
                transition={slide}
              >
                {o.label}
              </motion.span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
