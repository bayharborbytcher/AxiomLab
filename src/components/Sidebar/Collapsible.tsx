import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronIcon } from '../shared/icons';

interface CollapsibleProps { title: string; defaultOpen?: boolean; children: ReactNode }

/** Disclosure section. Height, fade and the chevron all run on one spring, so it opens and closes as a single motion. */
export function Collapsible({ title, defaultOpen = true, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const t: Transition = reduce ? { duration: 0.15 } : { type: 'spring', duration: 0.5, bounce: 0 };

  return (
    <section className="border-b border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full select-none items-center justify-between px-4 py-3 text-left text-sm font-semibold tracking-tight"
      >
        {title}
        <motion.span initial={false} animate={{ rotate: open ? 0 : -90 }} transition={t} className="text-fg/60">
          <ChevronIcon className="h-4 w-4" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={t}
        style={{ overflow: 'hidden' }}
        aria-hidden={!open}
      >
        <motion.div initial={false} animate={{ y: open ? 0 : -8, filter: open ? 'blur(0px)' : 'blur(4px)' }} transition={t}>
          {children}
        </motion.div>
      </motion.div>
    </section>
  );
}
