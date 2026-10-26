import { BASIC_GATES } from '../../engine/gates';
import type { BasicGateType } from '../../types/gate';
import { GateCard } from './GateCard';

interface GatePaletteProps {
  gates?: BasicGateType[];
  /** Placeholders for gates that arrive in a later phase */
  soon?: string[];
}

export function GatePalette({ gates = BASIC_GATES, soon = [] }: GatePaletteProps) {
  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-2 px-4 pb-4 pt-2">
      {gates.map((type) => (
        <li key={type}>
          <GateCard type={type} />
        </li>
      ))}
      {soon.map((name) => (
        <li key={name} className="rounded-lg border border-border bg-panel px-3 py-2 text-center text-sm italic text-fg/60">
          {name}
        </li>
      ))}
    </ul>
  );
}
