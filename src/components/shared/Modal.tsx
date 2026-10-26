import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { spring } from './motion';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Centered confirmation sheet: frosted card over a dimmed, blurred scrim. Esc or a click outside closes it. */
export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onPointerDown={onClose}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={title}
            className="w-80 rounded-2xl border border-border bg-surface/90 p-5 shadow-2xl backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={spring}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <h2 className="m-0 font-display text-[17px] font-bold tracking-[-0.022em]">{title}</h2>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
