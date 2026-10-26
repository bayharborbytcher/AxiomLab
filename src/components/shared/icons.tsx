interface IconProps { className?: string }

// The trash, folder, share, undo and redo icons are your supplied artwork, traced to vectors so they stay sharp at any size.
// The rest are drawn in the same weight on the same 96-unit grid.
const VB = '22 22 96 96';
const stroke = { viewBox: VB, fill: 'none', stroke: 'currentColor', strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;
const solid = { viewBox: VB, fill: 'currentColor', stroke: 'currentColor', strokeWidth: 8, strokeLinejoin: 'round', 'aria-hidden': true } as const;

const TRACED = {
  trash: 'M82.4 54.9L80.8 55.3L80.3 55.8L79.9 57.1L78.9 95.3L79.3 96.2L80.4 96.9L81.4 96.9L82.2 96.6L82.8 95.8L83.1 94.7L84.1 56.6L83.7 55.6ZM69.9 54.9L69.2 55.2L68.2 56.7L68.2 95.2L69.4 96.8L70.9 96.9L71.8 96.4L72.6 94.8L72.6 57.1L71.6 55.2ZM58.1 54.9L57.1 55.6L56.6 56.8L57.6 94.2L58.4 96.6L59.2 96.9L60.3 96.9L61.6 95.9L61.9 94.8L61.1 70.9L60.8 56.7L60.2 55.6L59.6 55.1ZM59.8 29.4L57.1 31.1L55.1 33.8L54.4 37.6L54.6 41.3L53.8 42.7L53.3 42.9L37.6 42.9L36.2 43.8L35.6 45.3L36.1 46.9L36.8 47.7L38.8 48.2L41.4 48.1L42.2 48.3L42.8 49.2L44.2 81.2L44.9 91.6L45.1 98.8L45.3 101.6L46.2 104.4L47.1 105.7L49.3 107.7L52.9 108.8L87.8 108.8L91.2 107.8L93.7 105.7L94.7 104.1L95.6 100.2L97.9 49.1L98.2 48.4L98.8 48.1L101.2 48.2L103.8 47.7L104.8 46.6L104.9 44.4L104.1 43.4L102.1 42.8L86.9 42.8L86.4 42.6L86.1 41.8L86.1 36.7L85.6 33.8L83.4 30.9L80.4 29.3L77.2 28.9L63.4 28.9ZM48.9 48.3L49.6 48.1L91.3 48.1L91.9 48.6L92.2 49.3L91.9 58.3L91.2 69.1L89.9 99.9L89.1 101.8L88.2 102.7L86.3 103.3L54.4 103.3L52.8 102.9L51.4 101.6L50.8 99.6L49.8 76.7L49.1 66.4L48.8 56.2L48.3 49.3ZM60.2 36.7L61.3 34.9L63.1 34.1L78.1 34.2L79.9 35.6L80.3 36.6L80.4 41.7L80.1 42.4L79.3 42.9L60.9 42.8L60.1 41.7Z',
  folder: 'M31.3 42.3L29.9 44.9L29.1 50.7L29.1 92.4L29.9 98.2L32.2 101.8L35.4 103.8L40.2 104.6L99.9 104.6L104.2 103.8L107.6 101.6L109.6 97.9L110.1 94.3L110.1 55.8L109.4 51.9L107.2 48.3L103.7 46.2L99.2 45.6L65.3 45.6L62.7 45.2L59.9 43.8L55.3 40.2L52.1 39.1L39.4 38.9L36.9 39.2L33.9 40.2ZM35.1 65.6L35.9 64.9L103.6 64.9L104.2 65.7L104.2 92.9L103.9 95.2L102.9 96.8L101.6 97.9L98.7 98.6L40.7 98.6L38.1 98.1L36.1 96.4L35.1 93.1ZM35.2 49.1L36.2 46.7L38.6 45.1L49.3 44.9L52.2 45.9L55.6 48.7L58.4 50.6L61.1 51.3L63.2 51.6L98.7 51.6L101.1 51.9L103.1 53.4L103.9 54.9L104.2 58.6L103.4 59.7L36.2 59.7L35.1 58.6Z',
  share: 'M39.8 54.8L37.9 57.9L37.1 63.6L37.1 97.4L37.9 103.2L40.2 106.8L43.4 108.8L48.1 109.6L89.9 109.6L94.6 108.8L98.1 106.4L99.9 103.4L100.8 98.7L100.8 62.4L99.9 57.7L97.6 54.2L93.9 52.2L89.7 51.7L79.4 51.7L78.6 52.4L78.6 56.7L79.1 57.6L91.4 57.9L93.6 59.4L94.7 62.2L94.8 98.3L94.2 100.7L93.1 102.2L91.8 103.1L89.2 103.6L48.7 103.6L46.1 103.1L44.8 102.2L43.8 100.9L43.1 98.1L43.1 63.1L43.3 61.7L44.2 59.6L46.4 57.9L58.8 57.6L59.3 56.7L59.3 52.6L58.6 51.7L48.2 51.7L43.6 52.3L40.6 54.1ZM68.2 28.9L66.6 29.9L54.2 42.1L53.9 43.9L54.3 44.8L55.6 45.7L57.3 45.7L59.8 43.4L65.3 37.3L66.2 37.7L66.1 78.8L66.3 79.7L67.4 80.9L69.4 81.3L70.7 80.8L71.8 79.2L71.7 37.8L72.2 37.3L72.7 37.4L78.3 43.7L80.8 45.8L81.9 45.8L83.1 45.2L83.8 44.4L84.1 43.1L83.1 41.3L71.1 29.7L70.2 29.1Z',
  undo: 'M57.4 42.3L36.1 63.4L35.2 64.9L35.2 66.3L36.2 68.2L56.8 88.6L58.7 89.7L60.2 89.7L61.9 88.6L62.7 86.9L62.7 86.1L61.9 84.4L51.6 74.2L46.2 69.7L46.1 69.3L46.6 68.8L79.8 69.1L84.9 69.9L87.7 70.9L90.9 73.1L93.9 76.4L95.9 80.9L96.3 84.9L95.9 89.7L93.9 94.3L91.6 97.2L87.7 99.9L84.1 101.2L78.9 101.9L67.9 102.1L66.3 103.3L65.8 105.4L66.3 107.1L67.1 107.8L69.2 108.6L78.6 108.6L81.7 108.1L85.2 107.9L91.4 105.8L96.1 102.6L99.7 98.2L102.1 92.4L102.9 86.4L102.7 81.4L101.8 77.7L99.6 72.8L96.8 69.3L92.9 66.2L88.9 64.2L84.9 63.1L78.7 62.3L52.3 62.3L46.4 62.7L46.2 62.3L46.4 61.7L51.8 56.9L61.9 46.9L62.6 45.7L62.7 44.6L61.8 42.7L60.2 41.8L58.8 41.8Z',
  redo: 'M80.7 42.3L79.3 41.8L77.9 41.8L76.6 42.4L75.6 44.3L75.9 46.6L86.6 57.2L91.8 61.9L91.6 62.7L85.8 62.3L59.4 62.3L53.2 63.1L49.2 64.2L45.2 66.2L41.1 69.6L38.3 73.2L36.3 77.7L35.3 82.6L35.2 86.8L36.1 92.7L38.2 97.8L41.1 101.6L42.2 102.7L46.7 105.8L53.1 107.9L59.6 108.6L68.9 108.6L71.1 107.8L71.9 106.8L72.3 105.4L71.8 103.3L70.2 102.1L59.3 101.9L54.1 101.2L50.7 100.1L46.7 97.3L44.2 94.3L42.1 89.2L41.8 86.2L42.1 81.6L44.1 76.6L45.8 74.4L48.6 72.1L50.4 70.9L53.2 69.9L58.3 69.1L91.6 68.8L91.9 69.7L86.6 74.2L76.2 84.4L75.6 85.8L75.6 87.2L76.1 88.4L77.6 89.6L79.4 89.7L81.4 88.4L101.9 68.2L102.7 67.1L102.9 65.2L101.9 63.3Z',
};

function Traced({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox={VB} fill="currentColor" aria-hidden="true" className={className}>
      <path fillRule="evenodd" d={d} />
    </svg>
  );
}

export const ClearIcon = ({ className }: IconProps) => <Traced d={TRACED.trash} className={className} />;
export const OpenIcon = ({ className }: IconProps) => <Traced d={TRACED.folder} className={className} />;
export const ExportIcon = ({ className }: IconProps) => <Traced d={TRACED.share} className={className} />;
export const UndoIcon = ({ className }: IconProps) => <Traced d={TRACED.undo} className={className} />;
export const RedoIcon = ({ className }: IconProps) => <Traced d={TRACED.redo} className={className} />;

export const EraserIcon = ({ className }: IconProps) => (
  <svg {...stroke} className={className}>
    <g transform="rotate(-45 70 64)"><rect x="38" y="46" width="64" height="38" rx="10" /><path d="M62 46v38" /></g>
    <path d="M52 106h56" />
  </svg>
);
export const SaveIcon = ({ className }: IconProps) => (
  <svg {...stroke} className={className}>
    <path d="M70 30v46M55 62l15 15 15-15" />
    <path d="M52 62H48a9 9 0 0 0-9 9v28a9 9 0 0 0 9 9h44a9 9 0 0 0 9-9V71a9 9 0 0 0-9-9h-4" />
  </svg>
);
export const PlayIcon = ({ className }: IconProps) => (
  <svg {...solid} className={className}><path d="M54 40L102 70L54 100Z" /></svg>
);
export const PauseIcon = ({ className }: IconProps) => (
  <svg viewBox={VB} fill="currentColor" aria-hidden="true" className={className}><rect x="46" y="38" width="15" height="64" rx="6" /><rect x="79" y="38" width="15" height="64" rx="6" /></svg>
);
export const StepIcon = ({ className }: IconProps) => (
  <svg {...solid} className={className}><path d="M42 42L88 70L42 98Z" /><rect x="94" y="38" width="12" height="64" rx="6" stroke="none" /></svg>
);

export const ChevronIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d="M6 9l6 6 6-6" /></svg>
);
/** Points left. Rotate 180 degrees for right. */
export const ChevronLeftIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d="M10 3L5 8l5 5" /></svg>
);
export const GitHubIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path transform="scale(1.5)" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);
