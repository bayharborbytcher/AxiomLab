import { useEffect } from 'react';
import { useCircuitStore } from '../store/circuitStore';
import { useSimulationStore } from '../store/simulationStore';

/** Re-evaluates whenever the circuit changes, and ticks the clocks while the simulation runs. */
export function useSimulation(): void {
  const running = useSimulationStore((s) => s.running);

  useEffect(() => {
    const { recompute } = useSimulationStore.getState();
    recompute();
    return useCircuitStore.subscribe((s, prev) => {
      if (s.gates !== prev.gates || s.wires !== prev.wires) recompute();
    });
  }, []);

  useEffect(() => {
    if (!running) return;
    const due = new Map<string, number>(); // when each clock flips next
    let raf = 0;
    const tick = (now: number) => {
      const clocks = useCircuitStore.getState().gates.filter((g) => g.type === 'CLOCK');
      if (!clocks.length) {
        useSimulationStore.getState().setRunning(false);
        return;
      }
      const flips: string[] = [];
      for (const g of clocks) {
        const half = 500 / (g.hz ?? 1);
        const at = due.get(g.id) ?? now + half;
        if (now >= at) {
          flips.push(g.id);
          due.set(g.id, now - at > half ? now + half : at + half); // no burst of catch-up flips after a pause
        } else due.set(g.id, at);
      }
      if (flips.length) useSimulationStore.getState().flipClocks(flips);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
