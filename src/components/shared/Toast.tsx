import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useUIStore } from '../../store/uiStore';
import { spring } from './motion';

/** Short confirmation or error message at the bottom of the screen. */
export function Toast() {
  const toast = useUIStore((s) => s.toast);
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={spring}
            className={
              'rounded-full border bg-surface/85 px-4 py-2 text-sm font-medium shadow-xl backdrop-blur-xl ' +
              (toast.tone === 'error' ? 'border-pin-out/50 text-pin-out' : 'border-white/10')
            }
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
