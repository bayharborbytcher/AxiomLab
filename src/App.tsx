import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';
import { useState } from 'react';
import { useBootSequence } from './hooks/useBootSequence';
import { useKeyboard } from './hooks/useKeyboard';
import { useSimulation } from './hooks/useSimulation';
import { useUIStore } from './store/uiStore';
import { Header } from './components/Header/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { DragGhost } from './components/Sidebar/DragGhost';
import { CanvasContainer } from './components/Canvas/CanvasContainer';
import { TruthTable } from './components/TruthTable/TruthTable';
import { LoadingScreen } from './components/Loading/LoadingScreen';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { Toast } from './components/shared/Toast';
import { panelSpring } from './components/shared/motion';

export function App() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const truthTableOpen = useUIStore((s) => s.truthTableOpen);
  const reduceMotion = useReducedMotion();
  const { index, done } = useBootSequence(!!reduceMotion);
  const [loaded, setLoaded] = useState(false);
  useKeyboard();
  useSimulation();
  const slide: Transition = reduceMotion ? { duration: 0.15 } : panelSpring;

  return (
    <div className="flex h-full flex-col">
      <Header />
      <div className="flex min-h-0 flex-1">
        {/* Panels glide open and shut: the wrapper animates its width, the panel inside keeps its size. */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              key="sidebar"
              className="shrink-0 overflow-hidden"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={slide}
            >
              <Sidebar />
            </motion.div>
          )}
        </AnimatePresence>

        <CanvasContainer />

        <AnimatePresence initial={false}>
          {truthTableOpen && (
            <motion.div
              key="truth-table"
              className="shrink-0 overflow-hidden"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={slide}
            >
              <TruthTable />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DragGhost />
      <Toast />

      {/* The app is mounted underneath from the start, so the loading page reveals a finished layout. */}
      {/* If the loading page ever crashes, skip it rather than blanking the app. */}
      {!loaded && (
        <ErrorBoundary fallback={() => null} onError={() => setLoaded(true)}>
          <LoadingScreen index={index} done={done} onFinished={() => setLoaded(true)} />
        </ErrorBoundary>
      )}
    </div>
  );
}
