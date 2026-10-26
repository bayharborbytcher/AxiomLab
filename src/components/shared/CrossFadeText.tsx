import { motion, useReducedMotion } from 'framer-motion';

/** Swaps between fixed lines of text with a soft cross-fade. All lines share one grid cell, so the height never jumps. */
export function CrossFadeText({ items, index, className = '' }: { items: string[]; index: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid">
      {items.map((text, i) => (
        <motion.p
          key={text}
          aria-hidden={i !== index}
          className={className}
          style={{ gridArea: '1 / 1' }}
          initial={false}
          animate={{
            opacity: i === index ? 1 : 0,
            y: reduce || i === index ? 0 : i < index ? -6 : 6,
            filter: reduce || i === index ? 'blur(0px)' : 'blur(4px)',
          }}
          transition={reduce ? { duration: 0.15 } : { type: 'spring', duration: 0.5, bounce: 0 }}
        >
          {text}
        </motion.p>
      ))}
    </div>
  );
}
