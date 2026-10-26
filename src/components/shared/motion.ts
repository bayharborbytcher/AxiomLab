import type { Transition } from 'framer-motion';

/** House spring: critically damped (bounce 0). Add bounce only after a flick or throw. */
export const spring: Transition = { type: 'spring', duration: 0.35, bounce: 0 };
/** Press feedback: starts on pointer-down, so it must be quick. */
export const pressSpring: Transition = { type: 'spring', duration: 0.18, bounce: 0 };
/** Side panels sliding open and shut. */
export const panelSpring: Transition = { type: 'spring', duration: 0.5, bounce: 0 };
/** Every button rises this far on hover. Small on purpose. */
export const hoverLift = { y: -1.5 };
