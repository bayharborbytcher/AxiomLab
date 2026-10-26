import { useUIStore } from '../../store/uiStore';
import { GitHubIcon } from '../shared/icons';
import { IconButton } from '../shared/IconButton';
import { ModeToggle } from './ModeToggle';
import { Toolbar } from './Toolbar';

const GITHUB_URL = 'https://github.com/bayharborbytcher/AxiomLab';

export function Header() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const truthTableOpen = useUIStore((s) => s.truthTableOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleTruthTable = useUIStore((s) => s.toggleTruthTable);

  return (
    <header className="flex h-17 shrink-0 items-center gap-6 border-b border-border bg-surface px-4">
      <h1 className="m-0 whitespace-nowrap font-display text-[30px] font-black leading-none tracking-[0.01em] font-stretch-expanded">
        AxiomLAB
      </h1>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
        <Toolbar />
        <div className="flex items-center gap-2.5">
          <ModeToggle />
          <IconButton still size="lg" label="Show gate palette" active={sidebarOpen} onClick={toggleSidebar}>
            Gates
          </IconButton>
          <IconButton still size="lg" label="Show truth table" active={truthTableOpen} onClick={toggleTruthTable}>
            Truth table
          </IconButton>
          <IconButton
            icon
            size="lg"
            label="GitHub"
            data-github-button
            onClick={() => {
              if (GITHUB_URL) window.open(GITHUB_URL, '_blank', 'noopener,noreferrer');
            }}
          >
            <GitHubIcon className="h-5 w-5" />
          </IconButton>
        </div>
      </div>
    </header>
  );
}