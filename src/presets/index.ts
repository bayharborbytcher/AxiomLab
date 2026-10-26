import type { PresetSpec } from '../engine/circuitFile';
import fourBitAdder from './fourBitAdder.json';
import dFlipFlop from './dFlipFlop.json';
import fullAdder from './fullAdder.json';
import halfAdder from './halfAdder.json';
import mux2to1 from './mux2to1.json';
import srLatch from './srLatch.json';

/** Built-in example circuits, in the order they appear in the sidebar. */
export const PRESETS = [halfAdder, fullAdder, fourBitAdder, mux2to1, srLatch, dFlipFlop] as unknown as PresetSpec[];
