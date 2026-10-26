import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ThinkingOrb } from 'thinking-orbs';
import { BOOT_VIEW } from '../../hooks/useBootSequence';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { MAKER } from '../../lib/site';
import { PROJECT_FROM, USERNAME, WORDMARK } from './artwork';
import type { Artwork } from './artwork';

// Laid out on the 1920 x 1080 canvas of the mockup, then scaled to fit the window.
const BG = '#141414';
const CAPSULE_BG = '#1a1a1a';
const LINE = { x: 1045, y: 394, w: 4, h: 320 };
// The description box. size is the largest the text will ever be. If it does not fit inside maxH it steps down
// (never below min) until it does. maxH is how far the text may grow downwards from y, so the text can reach
// y + maxH = 618, which still leaves a gap above the orb (the orb's top edge is at 658 - 16 = 642).
const PARA = { x: 1127, y: 409, w: 720, size: 18, min: 16, maxH: 214 };

/** The description shown above the orb. Edit freely: the size adjusts itself to keep the gap above the orb. */
const INTRO =
  'AxiomLab represents a state-of-the-art, browser-native workbench meticulously engineered for advanced digital logic design and real-time circuit simulation. ' +
  'Seamlessly architect complex systems using standard IEEE-style logic gates, latches, and flip-flops, interconnecting components via an intuitive interface where luminous, glowing traces vividly illustrate dynamic signal propagation. ' +
  'As your designs evolve, the platform autonomously derives comprehensive truth tables and minimized Boolean expressions in real time. Intelligent diagnostic engines proactively isolate potential feedback loops and race conditions, ensuring robust, stable execution across every iteration.';
// The orb. Change ORB_SIZE (in design units) and everything re-aligns itself: the orb's left edge stays in line
// with the paragraph, it stays centred on the status line, and the text keeps the same gap from the orb.
const ORB_SIZE = 64;
const ORB = { size: ORB_SIZE, cx: PARA.x + ORB_SIZE / 2, cy: 658 };
const STATUS_X = PARA.x + ORB_SIZE + 21; // 21 = space between the orb and the status text

// The mockup puts the main group (wordmark, divider, paragraph, orb and status line) a little right of centre:
// 90 units of space on the left, 73 on the right. GROUP_SHIFT moves the whole group sideways by one shared amount,
// so the wordmark's left edge and the paragraph's right edge end up equally far from the sides of the screen.
// Everything inside keeps its position relative to everything else. NUDGE is for fine tuning by eye
// (design units: positive moves the group right, negative moves it left).
const NUDGE = 0;
const GROUP_SHIFT = 960 - (WORDMARK.x + PARA.x + PARA.w) / 2 + NUDGE;
const CHIP = { x: 1523, y: 983, w: 381, h: 75, avatar: 52, pad: 15 };
const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
const SLIDE: [number, number, number, number] = [0.76, 0, 0.24, 1];

interface LoadingScreenProps {
  /** Which message and orb to show (0 to 4, where 4 is "Ready") */
  index: number;
  /** True when loading is finished: the capsule folds into a circle and the page slides away */
  done: boolean;
  onFinished: () => void;
}

function useStage() {
  const read = () => ({ vw: window.innerWidth, vh: window.innerHeight });
  const [size, setSize] = useState(read);
  useEffect(() => {
    const on = () => setSize(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { ...size, u: Math.min(size.vw / 1920, size.vh / 1080) };
}

/** Stand-in if the orb library ever fails: a slowly turning dotted ring. */
function OrbFallback() {
  return (
    <motion.div
      className="h-full w-full rounded-full"
      style={{ border: '2px dotted rgba(255,255,255,0.6)', transform: 'scale(0.9)' }}
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export function LoadingScreen({ index, done, onFinished }: LoadingScreenProps) {
  const { vw, vh, u } = useStage();
  const reduce = !!useReducedMotion();
  const [scope, animate] = useAnimate();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const finish = useRef(onFinished);
  finish.current = onFinished;
  const started = useRef(false);
  const paraRef = useRef<HTMLParagraphElement>(null);

  const view = BOOT_VIEW[Math.min(index, BOOT_VIEW.length - 1)];
  const spring: Transition = { type: 'spring', duration: 0.6, bounce: 0 };

  const stage: CSSProperties = { position: 'absolute', left: (vw - 1920 * u) / 2, top: (vh - 1080 * u) / 2, width: 1920 * u, height: 1080 * u };
  const at = (x: number, y: number, w?: number, h?: number): CSSProperties => ({
    position: 'absolute', left: x * u, top: y * u, ...(w !== undefined && { width: w * u }), ...(h !== undefined && { height: h * u }),
  });
  const art = (a: Artwork, x = a.x, y = a.y, label?: string) => (
    <svg
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      viewBox={`0 0 ${a.w} ${a.h}`}
      style={{ ...at(x, y, a.w, a.h), overflow: 'visible' }}
      fill="#ffffff"
    >
      <path fillRule="evenodd" d={a.d} />
    </svg>
  );

  // The exit: the capsule folds into a circle, then the page slides up while the circle rides up with it
  // and lands exactly on the GitHub button in the header.
  useEffect(() => {
    if (!done || started.current) return;
    started.current = true;
    void (async () => {
      const chip = scope.current?.querySelector('[data-chip]') as HTMLElement | null;
      const target = document.querySelector('[data-github-button]') as HTMLElement | null;
      if (reduce || !chip || !target) {
        await animate(scope.current, { opacity: 0 }, { duration: 0.3 });
        finish.current();
        return;
      }
      await Promise.all([
        animate('[data-chip]', { width: CHIP.h * u }, spring),
        animate('[data-chip-name]', { opacity: 0, x: -10 * u }, { duration: 0.2 }),
        animate('[data-chip-avatar]', { x: ((CHIP.h - CHIP.avatar) / 2 - CHIP.pad) * u }, spring),
      ]);
      const c = chip.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      const motion2 = { duration: 0.95, ease: SLIDE };
      await Promise.all([
        animate('[data-curtain]', { y: '-100%' }, motion2),
        animate(
          '[data-chip]',
          { x: t.left + t.width / 2 - (c.left + c.width / 2), y: t.top + t.height / 2 - (c.top + c.height / 2), scale: t.width / c.width },
          motion2,
        ),
      ]);
      await animate('[data-chip]', { opacity: 0 }, { duration: 0.3 }); // the real button takes over
      finish.current();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  // The orb plays its "solving" animation straight through. Nothing touches it when the message changes.

  // Fit the description: start at PARA.size and step down only if the text would run too close to the orb.
  // Re-runs once the fonts have loaded, because the final font changes the line breaks.
  const [fontsTick, setFontsTick] = useState(0);
  useEffect(() => {
    void document.fonts.ready.then(() => setFontsTick((n) => n + 1));
  }, []);
  useLayoutEffect(() => {
    const el = paraRef.current;
    if (!el) return;
    let size = PARA.size;
    el.style.fontSize = `${size * u}px`;
    while (size > PARA.min && el.offsetHeight > PARA.maxH * u) {
      size -= 0.5;
      el.style.fontSize = `${size * u}px`;
    }
  }, [u, fontsTick]);

  const words = INTRO.split(' ');
  const fade = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 10 * u },
    animate: { opacity: 1, y: 0 },
    transition: { ...spring, delay },
  });

  return (
    <div ref={scope} role="status" aria-live="polite" aria-label="Loading AxiomLab" className="fixed inset-0 z-50 overflow-hidden">
      {/* The page that slides away */}
      <motion.div data-curtain className="absolute inset-0" style={{ background: BG }}>
        <div style={stage}>
          <div style={{ position: 'absolute', inset: 0, transform: `translateX(${Math.round(GROUP_SHIFT * u)}px)` }}>
            {art(WORDMARK, undefined, undefined, 'AxiomLab')}

            <motion.div
              style={{ ...at(LINE.x, LINE.y, LINE.w, LINE.h), background: '#ffffff', transformOrigin: 'top' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
            />

            <p
              ref={paraRef}
              className="m-0 font-sans font-medium text-pretty text-white"
              style={{ ...at(PARA.x, PARA.y, PARA.w), lineHeight: 1.36, letterSpacing: '-0.012em' }}
            >
              {words.map((word, i) => (
                <Fragment key={i}>
                  <motion.span
                    className="inline-block"
                    initial={{ opacity: 0, y: reduce ? 0 : 8 * u, filter: reduce ? 'blur(0px)' : 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ ...spring, delay: 0.45 + i * 0.016 }}
                  >
                    {word}
                  </motion.span>{' '}
                </Fragment>
              ))}
            </p>

            {/* The orb and its message change together */}
            <motion.div {...fade(0.9)} style={at(ORB.cx - ORB.size / 2, ORB.cy - ORB.size / 2, ORB.size, ORB.size)}>
              <div data-orb className="h-full w-full">
                <ErrorBoundary fallback={() => <OrbFallback />}>
                  {/* The library only has two sizes (64 and 20), so draw the 64 and scale it down to ORB.size on the stage. */}
                  <div style={{ width: 64, height: 64, transform: `scale(${(u * ORB.size) / 64})`, transformOrigin: '0 0' }}>
                    <ThinkingOrb state="solving" size={64} theme="dark" />
                  </div>
                </ErrorBoundary>
              </div>
            </motion.div>

            <motion.div {...fade(0.9)} className="flex items-center" style={at(STATUS_X, ORB.cy - 16, 640, 32)}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={view.label}
                  className="m-0 whitespace-nowrap font-sans text-white"
                  style={{ fontSize: 21 * u, letterSpacing: '-0.02em' }}
                  initial={{ opacity: 0, y: reduce ? 0 : 14 * u, filter: reduce ? 'blur(0px)' : 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: reduce ? 0 : -14 * u, filter: reduce ? 'blur(0px)' : 'blur(4px)' }}
                  transition={{ duration: 0.38, ease: EASE }}
                >
                  {view.label}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </div>

          <motion.div {...fade(0.8)} style={at(0, 0, 1920, 1080)}>
            {art(PROJECT_FROM, undefined, undefined, 'a project from')}
          </motion.div>
        </div>
      </motion.div>

      {/* The capsule sits on its own layer, so it can leave the page it started on */}
      <div style={{ ...stage, pointerEvents: 'none' }}>
        <motion.div
          data-chip
          className="overflow-hidden rounded-full"
          style={{ ...at(CHIP.x, CHIP.y, CHIP.w, CHIP.h), background: CAPSULE_BG }}
          {...fade(0.8)}
        >
          <div
            data-chip-avatar
            className="overflow-hidden rounded-full"
            style={{ ...at(CHIP.pad, (CHIP.h - CHIP.avatar) / 2, CHIP.avatar, CHIP.avatar), background: '#2a2a2a' }}
          >
            {avatarFailed ? (
              <span className="grid h-full w-full place-items-center font-sans font-bold text-white" style={{ fontSize: 26 * u }}>
                {MAKER.username[0].toUpperCase()}
              </span>
            ) : (
              <img
                src={MAKER.avatar}
                alt=""
                draggable={false}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div data-chip-name style={{ position: 'absolute', inset: 0 }}>
            {art(USERNAME, USERNAME.x - CHIP.x, USERNAME.y - CHIP.y, MAKER.username)}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
