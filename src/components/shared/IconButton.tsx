import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';
import { pressSpring } from './motion'; // removed hoverLift import if unused elsewhere
import { Tooltip } from './Tooltip';

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Accessible name, and the tooltip text */
  label: string;
  /** Pass for toggle buttons; omit for plain buttons */
  active?: boolean;
  /** No hover reaction at all */
  still?: boolean;
  /** Round button that holds a single icon */
  icon?: boolean;
  /** Sits inside a glass group: no glass of its own, only a fill on hover or when selected */
  bare?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Show the animated tooltip. On by default. */
  tip?: boolean;
  shortcut?: string;
  children: ReactNode;
}

const HEIGHT = { sm: 'h-8', md: 'h-9', lg: 'h-10' };
const WIDTH = { sm: 'w-8', md: 'w-9', lg: 'w-10' };
const PAD = { sm: 'px-3.5', md: 'px-4', lg: 'px-5' };

/** Capsule button. Stand-alone buttons are Liquid Glass; `bare` ones live inside a shared glass capsule. */
export function IconButton({
  label, active, still, icon, bare, size = 'md', tip = true, shortcut, disabled, children, className = '', ...rest
}: IconButtonProps) {
  const button = (
    <motion.button
      type="button"
      title={tip ? undefined : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      whileHover={undefined} // Hover animation removed
      whileTap={disabled ? undefined : { scale: 0.94 }}
      transition={pressSpring}
      className={
        'inline-flex shrink-0 select-none items-center justify-center rounded-full text-sm font-medium text-fg transition-[background-color,box-shadow,opacity,filter] duration-200 active:brightness-125 ' +
        HEIGHT[size] + ' ' + (icon ? WIDTH[size] : PAD[size]) + ' ' +
        (bare
          ? (active ? 'bg-white/20 ' : '') // Removed hover:bg-white/12
          : (active ? 'glass glass-on ' : 'glass ')) + // Removed hover:brightness-110
        (active === false ? 'text-fg/70 ' : '') +
        'disabled:pointer-events-none disabled:opacity-40 ' +
        className
      }
      {...rest}
    >
      {children}
    </motion.button>
  );
  return tip ? (
    <Tooltip label={label} shortcut={shortcut} disabled={disabled}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}