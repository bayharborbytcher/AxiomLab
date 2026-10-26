import { useEffect } from 'react';
import type { RefObject } from 'react';
import { CanvasManager } from '../canvas/canvasManager';

/** Creates a CanvasManager for the <canvas> in `ref` and cleans it up on unmount. */
export function useCanvas(ref: RefObject<HTMLCanvasElement | null>): void {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const manager = new CanvasManager(canvas);
    return () => manager.destroy();
  }, [ref]);
}
