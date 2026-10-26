import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItem {
  label: string;
  shortcut?: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuProps { x: number; y: number; items: MenuItem[]; onClose: () => void }

const W = 208;

/** Frosted menu that opens at the pointer. Esc, a click elsewhere, scrolling or resizing closes it; arrow keys move. */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const left = Math.max(8, Math.min(x, window.innerWidth - W - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - (items.length * 32 + 12)));

  useEffect(() => {
    const away = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const all = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
      const i = all.indexOf(document.activeElement as HTMLButtonElement);
      all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length]?.focus();
    };
    document.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', keys);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    window.addEventListener('wheel', onClose, { passive: true });
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => {
      document.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', keys);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('wheel', onClose);
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      ref={ref}
      role="menu"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
      style={{ left, top, width: W, transformOrigin: 'top left' }}
      className="fixed z-[65] rounded-xl border border-white/10 bg-surface/80 p-1 shadow-2xl backdrop-blur-xl"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={
            'flex h-8 w-full items-center justify-between rounded-lg px-3 text-left text-sm outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/10 disabled:opacity-40 ' +
            (item.danger ? 'text-pin-out' : '')
          }
        >
          {item.label}
          {item.shortcut && <span className="text-xs text-fg/45">{item.shortcut}</span>}
        </button>
      ))}
    </motion.div>,
    document.body,
  );
}
