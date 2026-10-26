import { motion } from 'framer-motion';
import { beginPaletteDrag } from '../../canvas/interaction';
import { BUBBLE_R, GATE_W, SHAPES, leadsD } from '../../canvas/gateShapes';
import { GATE_DEFS } from '../../engine/gates';
import { useUIStore } from '../../store/uiStore';
import type { BasicGateType } from '../../types/gate';
import { hoverLift, pressSpring } from '../shared/motion';

interface GlyphProps { type: BasicGateType; className?: string; strokeWidth?: number }

/** SVG drawing of a gate, built from the same path data the canvas uses. Colour comes from currentColor. */
export function GateGlyph({ type, className = '', strokeWidth = 3 }: GlyphProps) {
  const s = SHAPES[type];
  return (
    <svg
      viewBox="-24 -4 128 88"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={s.body} />
      {s.extra && <path d={s.extra} />}
      {s.label && <text x="40" y="47" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor" stroke="none">{s.label}</text>}
      <path d={leadsD(type)} />
      {s.bubble && <circle cx={GATE_W - BUBBLE_R} cy={40} r={BUBBLE_R} />}
    </svg>
  );
}

export function GateCard({ type }: { type: BasicGateType }) {
  const locked = useUIStore((s) => s.mode !== 'edit'); // Operate mode: the palette is read-only
  return (
    <motion.div
      onPointerDown={(e) => {
        if (e.button === 0 && !locked) beginPaletteDrag(type, e.clientX, e.clientY);
      }}
      whileHover={locked ? undefined : hoverLift}
      whileTap={locked ? undefined : { scale: 0.96 }}
      transition={pressSpring}
      title={locked ? 'Switch to Edit mode to add gates' : `Drag ${GATE_DEFS[type].label} onto the canvas`}
      className={
        'flex touch-none select-none flex-col items-center gap-1 rounded-lg border border-border bg-panel px-2 pb-2 pt-1.5 text-xs text-fg transition-[border-color] ' +
        (locked ? 'cursor-not-allowed' : 'cursor-grab hover:border-accent/60')
      }
    >
      <GateGlyph type={type} className="h-11 w-full" />
      <span className="font-semibold tracking-tight">{GATE_DEFS[type].label}</span>
    </motion.div>
  );
}
