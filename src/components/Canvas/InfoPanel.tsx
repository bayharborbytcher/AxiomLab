import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { GATE_DEFS, isSequential } from '../../engine/gates';
import { useCircuitStore } from '../../store/circuitStore';
import { track } from '../../store/historyStore';
import { useSelectionStore } from '../../store/selectionStore';
import { useSimulationStore } from '../../store/simulationStore';
import { useUIStore } from '../../store/uiStore';
import { ChevronLeftIcon } from '../shared/icons';
import { IconButton } from '../shared/IconButton';
import { hoverLift, pressSpring, spring } from '../shared/motion';
import { Tooltip } from '../shared/Tooltip';

const HZ = [0.5, 1, 2, 4, 8];
const W = 300;
const CLOSED = 40;

/**
 * Glass card at the top right of the canvas. It describes the gate you are dragging out of the sidebar,
 * or the single gate you have selected, and it appears and disappears with them.
 * The chevron collapses it to a small circle, like the controls card on the left.
 */
export function InfoPanel() {
  const dragType = useUIStore((s) => s.paletteDrag?.type ?? null);
  const open = useUIStore((s) => s.infoOpen);
  const setOpen = useUIStore((s) => s.setInfoOpen);
  const id = useSelectionStore((s) => (s.gateIds.length === 1 && !s.wireIds.length ? s.gateIds[0] : null));
  const gate = useCircuitStore((s) => (id ? (s.gates.find((g) => g.id === id) ?? null) : null));
  const q = useSimulationStore((s) => (id ? s.gateOutputs[id]?.[0] : undefined));
  const reduce = useReducedMotion();
  const morph: Transition = reduce ? { duration: 0.15 } : { type: 'spring', duration: 0.55, bounce: 0 };

  const type = dragType ?? gate?.type ?? null;
  const def = type ? GATE_DEFS[type] : null;
  const placed = !dragType && gate; // settings only for a gate that is on the canvas

  return (
    <AnimatePresence>
      {type && def && (
        <motion.div
          key="info"
          className="absolute right-4 top-4"
          style={{ transformOrigin: 'top right' }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={spring}
        >
          <motion.div
            className="glass relative overflow-hidden"
            initial={false}
            animate={{ width: open ? W : CLOSED, height: open ? 'auto' : CLOSED, borderRadius: 20 }}
            transition={morph}
          >
            <motion.div
              style={{ width: W, pointerEvents: open ? 'auto' : 'none' }}
              aria-hidden={!open}
              className="px-4 pb-3.5 pt-3"
              animate={{ opacity: open ? 1 : 0, filter: open ? 'blur(0px)' : 'blur(6px)' }}
              transition={{ duration: open ? 0.25 : 0.12, delay: open ? 0.15 : 0 }}
            >
              <motion.div key={type} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                <h3 className="m-0 pr-9 text-sm font-semibold tracking-tight">{def.label}</h3>
                <p className="m-0 mt-1 text-xs italic leading-relaxed text-fg/65">{def.blurb}</p>
                {placed && isSequential(placed.type) && (
                  <p className="m-0 mt-2 text-xs font-semibold">Stored value: Q = {String(q ?? 0)}</p>
                )}
                {placed && placed.type === 'CLOCK' && (
                  <div className="mt-3">
                    <p className="m-0 mb-2 text-xs font-semibold text-fg/70">Frequency (Hz)</p>
                    <div className="flex gap-1.5">
                      {HZ.map((hz) => (
                        <IconButton
                          key={hz}
                          size="sm"
                          label={`${hz} hertz`}
                          active={(placed.hz ?? 1) === hz}
                          onClick={() => track('Set frequency', () => useCircuitStore.getState().setClockHz(placed.id, hz))}
                        >
                          {hz}
                        </IconButton>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>

            <Tooltip label={open ? 'Hide gate info' : 'Show gate info'}>
              <motion.button
                type="button"
                onClick={() => setOpen(!open)}
                aria-label={open ? 'Hide gate info' : 'Show gate info'}
                aria-expanded={open}
                className="absolute right-0 top-0 grid h-10 w-10 place-items-center text-fg/80 transition-colors hover:text-fg"
                whileHover={hoverLift}
                whileTap={{ scale: 0.86 }}
                transition={pressSpring}
              >
                <motion.span initial={false} animate={{ rotate: open ? 180 : 0 }} transition={morph}>
                  <ChevronLeftIcon className="h-4 w-4" />
                </motion.span>
              </motion.button>
            </Tooltip>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
