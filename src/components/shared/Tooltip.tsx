import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps { label: string; shortcut?: string; disabled?: boolean; children: ReactNode }

/** Frosted label that appears after a short pause on hover, or on keyboard focus. Goes below the control, or above it near the bottom of the screen. */
export function Tooltip({ label, shortcut, disabled, children }: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef(0);
  const [at, setAt] = useState<{ x: number; y: number; above: boolean } | null>(null);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = (ref.current?.firstElementChild ?? ref.current)?.getBoundingClientRect();
      if (!r) return;
      const above = r.bottom + 56 > window.innerHeight;
      setAt({ x: r.left + r.width / 2, y: above ? r.top - 8 : r.bottom + 8, above });
    }, 350);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setAt(null);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span
      ref={ref}
      className={'inline-flex ' + (disabled ? 'cursor-not-allowed' : '')}
      onPointerEnter={show}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={(e) => (e.target as HTMLElement).matches(':focus-visible') && show()}
      onBlur={hide}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {at && (
            <div
              className={'pointer-events-none fixed z-[70] -translate-x-1/2 ' + (at.above ? '-translate-y-full' : '')}
              style={{ left: at.x, top: at.y }}
            >
              <motion.div
                role="tooltip"
                initial={{ opacity: 0, y: at.above ? 4 : -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: at.above ? 2 : -2, scale: 0.98 }}
                transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
                className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-surface/85 px-3 py-1.5 text-xs font-medium shadow-xl backdrop-blur-xl"
              >
                {label}
                {shortcut && <span className="text-fg/50">{shortcut}</span>}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}
