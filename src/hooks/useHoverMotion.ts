import { useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import type { MotionStyle } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { PointerEvent } from 'react';

interface Options { tilt?: number; shift?: number }

/**
 * Pointer-following hover motion: the element leans and drifts toward the cursor, springing back on leave.
 * Pointer events are coalesced to one update per animation frame (throttled); springs smooth the rest.
 */
export function useHoverMotion({ tilt = 8, shift = 3 }: Options = {}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0); // pointer offset from the element's centre, -1 to 1
  const py = useMotionValue(0);
  const spring = { stiffness: 320, damping: 30, mass: 0.6 };
  const rotateY = useSpring(useTransform(px, (v) => v * tilt), spring);
  const rotateX = useSpring(useTransform(py, (v) => -v * tilt), spring);
  const x = useSpring(useTransform(px, (v) => v * shift), spring);
  const y = useSpring(useTransform(py, (v) => v * shift), spring);

  const frame = useRef(0);
  const latest = useRef<{ el: HTMLElement; cx: number; cy: number } | null>(null);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce || e.pointerType === 'touch') return;
    latest.current = { el: e.currentTarget, cx: e.clientX, cy: e.clientY };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const p = latest.current;
      if (!p) return;
      const r = p.el.getBoundingClientRect();
      px.set(((p.cx - r.left) / r.width) * 2 - 1);
      py.set(((p.cy - r.top) / r.height) * 2 - 1);
    });
  };

  const onPointerLeave = () => {
    latest.current = null;
    px.set(0);
    py.set(0);
  };

  const style: MotionStyle = { rotateX, rotateY, x, y, transformPerspective: 500 };
  return { style, onPointerMove, onPointerLeave };
}
