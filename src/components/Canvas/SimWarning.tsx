import { AnimatePresence, motion } from 'framer-motion';
import { useSimulationStore } from '../../store/simulationStore';
import { spring } from '../shared/motion';

/** Appears when the circuit contains a feedback loop. */
export function SimWarning() {
  const count = useSimulationStore((s) => s.cycleGateIds.length);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={spring}
            className="flex items-center gap-2 rounded-full border border-wire-undef/40 bg-surface/70 px-4 py-2 text-xs font-medium backdrop-blur-xl"
          >
            <span className="h-2 w-2 rounded-full bg-wire-undef" aria-hidden="true" />
            Feedback loop: {count} {count === 1 ? 'gate has' : 'gates have'} undefined outputs
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
