import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { useEffect } from 'react';
import { BASIC_GATES, IO_GATES } from '../../engine/gates';
import { useUIStore } from '../../store/uiStore';
import { CrossFadeText } from '../shared/CrossFadeText';
import { Collapsible } from './Collapsible';
import { FlipFlopPalette } from './FlipFlopPalette';
import { GatePalette } from './GatePalette';
import { PresetPalette } from './PresetPalette';

const HINTS = ['Drag a gate onto the canvas to place it.', 'Switch to Edit mode to add gates.'];

/** How long the dark takes to travel the height of the panel. */
const SWEEP: Transition = { type: 'spring', duration: 0.8, bounce: 0 };
/** Softness of the leading edge, as a percentage of the panel height. */
const FEATHER = 16;

export function Sidebar() {
  const locked = useUIStore((s) => s.mode !== 'edit');
  const reduce = useReducedMotion();

  // 0 = Edit (no dark), 1 = Operate (fully dark). Animating this one number in both directions is what makes
  // the dark rise from the bottom going in, and drain back down coming out.
  const progress = useMotionValue(locked ? 1 : 0);
  useEffect(() => {
    const controls = animate(progress, locked ? 1 : 0, reduce ? { duration: 0.15 } : SWEEP);
    return () => controls.stop();
  }, [locked, reduce, progress]);

  // The dark layer is only visible below the "front", which travels from just under the panel to just above it.
  const mask = useTransform(progress, (p) => {
    const front = p * (100 + 2 * FEATHER) - FEATHER; // % up from the bottom
    return `linear-gradient(to top, #000 ${front - FEATHER}%, transparent ${front + FEATHER}%)`;
  });

  return (
    <aside aria-label="Gate palette" className="relative h-full w-64 shrink-0 border-r border-border bg-surface">
      {/* Lenis smooths this scroll container. The page itself never scrolls, so it is scoped here. */}
      <ReactLenis className="h-full overflow-y-auto" options={{ lerp: 0.12 }}>
        {/* z-20 keeps the hint above the dark layer, so it stays readable in Operate mode */}
        <div className="relative z-20 px-4 pb-3 pt-3">
          <CrossFadeText items={HINTS} index={locked ? 1 : 0} className="m-0 text-xs italic leading-relaxed text-fg/60" />
        </div>
        <div className="border-t border-border">
          <Collapsible title="Basic gates"><GatePalette gates={BASIC_GATES} /></Collapsible>
          <Collapsible title="Input and output"><GatePalette gates={IO_GATES} /></Collapsible>
          <Collapsible title="Flip-flops"><FlipFlopPalette /></Collapsible>
          <Collapsible title="Examples"><PresetPalette /></Collapsible>
        </div>
      </ReactLenis>

      {/* The dark layer. Click-through, so the palette can still be scrolled in Operate mode. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-surface/70"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      />
    </aside>
  );
}
