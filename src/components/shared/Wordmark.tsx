import { WORDMARK_LINE, WORDMARK_STACKED } from './wordmarkPaths';

interface WordmarkProps {
  /** "line" is AxiomLAB on one row; "stacked" is Axiom over LAB, like the loading page. */
  variant?: 'line' | 'stacked';
  /** Set the height here (for example "h-[22px]"). The width follows. The colour comes from text-* classes. */
  className?: string;
}

/** The AxiomLab wordmark, drawn from the same outlines as the loading page so the weight matches exactly. */
export function Wordmark({ variant = 'line', className = '' }: WordmarkProps) {
  const art = variant === 'line' ? WORDMARK_LINE : WORDMARK_STACKED;
  return (
    <svg
      role="img"
      aria-label="AxiomLab"
      viewBox={`0 0 ${art.w} ${art.h}`}
      fill="currentColor"
      className={className}
      style={{ aspectRatio: `${art.w} / ${art.h}` }}
    >
      <path fillRule="evenodd" d={art.d} />
    </svg>
  );
}
