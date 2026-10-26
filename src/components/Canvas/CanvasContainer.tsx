import { useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { CanvasContextMenu } from './CanvasContextMenu';
import { HintsPanel } from './HintsPanel';
import { InfoPanel } from './InfoPanel';
import { Minimap } from './Minimap';
import { SimWarning } from './SimWarning';
import { ZoomControls } from './ZoomControls';

export function CanvasContainer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCanvas(canvasRef);

  return (
    <main aria-label="Circuit canvas" className="relative min-w-0 flex-1 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />
      <HintsPanel />
      <InfoPanel />
      <SimWarning />
      <ZoomControls />
      <Minimap />
      <CanvasContextMenu />
    </main>
  );
}
