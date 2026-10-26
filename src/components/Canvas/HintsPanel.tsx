import { motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { ChevronLeftIcon } from '../shared/icons';
import { hoverLift, pressSpring } from '../shared/motion';
import { Tooltip } from '../shared/Tooltip';

const EDIT_ROWS: [string, string][] = [
  ['Wire', 'Drag from one pin to another'],
  ['Move', 'Drag a gate, or hold M'],
  ['Pan', 'Hold Space and drag'],
  ['Zoom', 'Ctrl and scroll'],
  ['Remove', 'Select, then press Del'],
  ['Menu', 'Right-click a gate or wire'],
];
const OPERATE_ROWS: [string, string][] = [
  ['Toggle', 'Click an input or a clock'],
  ['Pan', 'Hold Space and drag'],
  ['Zoom', 'Ctrl and scroll'],
];
const W = 300;
const HEIGHT = { edit: 186, operate: 120 };
const CLOSED = 40;

/** Glass controls card. The chevron collapses it into a small circle, and back, in one continuous morph. */
export function HintsPanel() {
  const [open, setOpen] = useState(true);
  const mode = useUIStore((s) => s.mode);
  const reduce = useReducedMotion();
  const morph: Transition = reduce ? { duration: 0.15 } : { type: 'spring', duration: 0.55, bounce: 0 };
  const rows = mode === 'edit' ? EDIT_ROWS : OPERATE_ROWS;

  return (
    <motion.div
      className="glass absolute left-4 top-4 overflow-hidden"
      initial={false}
      animate={{ width: open ? W : CLOSED, height: open ? HEIGHT[mode] : CLOSED, borderRadius: 20 }}
      transition={morph}
    >
      <motion.div
        className="absolute left-0 top-0 px-4 pt-2.5"
        style={{ width: W, pointerEvents: open ? 'auto' : 'none' }}
        aria-hidden={!open}
        animate={{ opacity: open ? 1 : 0, filter: open ? 'blur(0px)' : 'blur(6px)' }}
        transition={{ duration: open ? 0.25 : 0.12, delay: open ? 0.15 : 0 }}
      >
        <h2 className="m-0 flex h-7 items-center text-xs font-semibold tracking-tight">Controls</h2>
        <motion.dl
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="m-0 grid grid-cols-[3.5rem_1fr] gap-x-3 text-xs leading-[22px]"
        >
          {rows.map(([name, how]) => (
            <div key={name} className="contents">
              <dt className="font-semibold">{name}</dt>
              <dd className="m-0 italic text-fg/60">{how}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      <Tooltip label={open ? 'Hide controls' : 'Show controls'}>
        <motion.button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Hide controls' : 'Show controls'}
          aria-expanded={open}
          className="absolute right-0 top-0 grid h-10 w-10 place-items-center text-fg/80 transition-colors hover:text-fg"
          whileHover={hoverLift}
          whileTap={{ scale: 0.86 }}
          transition={pressSpring}
        >
          <motion.span initial={false} animate={{ rotate: open ? 0 : 180 }} transition={morph}>
            <ChevronLeftIcon className="h-4 w-4" />
          </motion.span>
        </motion.button>
      </Tooltip>
    </motion.div>
  );
}
