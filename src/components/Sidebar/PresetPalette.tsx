import { motion } from 'framer-motion';
import { loadPreset } from '../../lib/files';
import { PRESETS } from '../../presets';
import { useUIStore } from '../../store/uiStore';
import { hoverLift, pressSpring } from '../shared/motion';

/** Built-in example circuits. Opening one replaces the canvas, and Ctrl Z brings the old one back. */
export function PresetPalette() {
  const locked = useUIStore((s) => s.mode !== 'edit');
  return (
    <ul className="m-0 flex list-none flex-col gap-2 px-4 pb-4 pt-2">
      {PRESETS.map((p) => (
        <li key={p.name}>
          <motion.button
            type="button"
            disabled={locked}
            onClick={() => loadPreset(p)}
            whileHover={locked ? undefined : hoverLift}
            whileTap={locked ? undefined : { scale: 0.98 }}
            transition={pressSpring}
            title={locked ? 'Switch to Edit mode to open examples' : undefined}
            className="flex w-full flex-col items-start gap-0.5 rounded-lg border border-border bg-panel px-3 py-2 text-left transition-[border-color] hover:border-accent/60 disabled:cursor-not-allowed"
          >
            <span className="text-sm font-semibold tracking-tight">{p.name}</span>
            <span className="text-xs italic text-fg/60">{p.description}</span>
          </motion.button>
        </li>
      ))}
    </ul>
  );
}
