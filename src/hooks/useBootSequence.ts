import { useEffect, useState } from 'react';
import { warmGateGeometry } from '../canvas/gateShapes';
import { useCircuitStore } from '../store/circuitStore';
import { useSimulationStore } from '../store/simulationStore';
import { useUIStore } from '../store/uiStore';

/** Animations of the thinking-orbs library. Each message on the loading page plays with one of them. */
export type OrbName = 'working' | 'shaping' | 'connecting' | 'composing' | 'solving';

interface Step { label: string; orb: OrbName; run: () => void | Promise<void> }

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Real start-up work, one step at a time. Add heavier steps here as the app grows.
const STEPS: Step[] = [
  {
    label: 'Preparing the logic engine',
    orb: 'working',
    run: () => {
      useUIStore.getState();
      useCircuitStore.getState();
    },
  },
  { label: 'Shaping the gate geometries', orb: 'shaping', run: warmGateGeometry },
  {
    label: 'Setting up the canvas',
    orb: 'connecting',
    run: () => {
      document.createElement('canvas').getContext('2d');
    },
  },
  {
    label: 'Calibrating the signal simulator',
    orb: 'working',
    run: () => {
      useSimulationStore.getState();
    },
  },
  {
    label: 'Tuning the typefaces',
    orb: 'composing',
    run: async () => {
      await Promise.race([document.fonts.ready, sleep(1500)]);
    },
  },
];

/** What the loading page shows at each stage: every step above, then "Ready". */
export const BOOT_VIEW: { label: string; orb: OrbName }[] = [
  ...STEPS.map(({ label, orb }) => ({ label, orb })),
  { label: 'Ready', orb: 'solving' },
];

export interface BootState { index: number; done: boolean }

export function useBootSequence(reduceMotion: boolean): BootState {
  const [state, setState] = useState<BootState>({ index: 0, done: false });

  useEffect(() => {
    let cancelled = false;
    const pace = reduceMotion ? 0 : 650; // minimum time per step, so each message can be read

    (async () => {
      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) return;
        setState({ index: i, done: false });
        await Promise.all([STEPS[i].run(), sleep(pace)]);
      }
      if (cancelled) return;
      setState({ index: STEPS.length, done: false }); // "Ready"
      await sleep(reduceMotion ? 200 : 900);
      if (!cancelled) setState((s) => ({ ...s, done: true }));
    })();

    return () => {
      cancelled = true;
    };
  }, [reduceMotion]);

  return state;
}
