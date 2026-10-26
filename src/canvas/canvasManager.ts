import { useCircuitStore } from '../store/circuitStore';
import { useSelectionStore } from '../store/selectionStore';
import { useSimulationStore } from '../store/simulationStore';
import { useUIStore } from '../store/uiStore';
import { centerViewport } from './grid';
import { Interaction } from './interaction';
import { readTheme, render } from './renderer';
import type { Theme } from './renderer';

/** Owns the <canvas>: sizing, redraw scheduling, and wiring renderer + interaction together. */
export class CanvasManager {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly theme: Theme = readTheme();
  private readonly interaction: Interaction;
  private readonly observer: ResizeObserver;
  private readonly unsubscribe: () => void;
  private raf = 0;
  private dpr = 1;
  private measured = false;
  private left = 0; // canvas left edge on screen, to notice when the sidebar moves it

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser does not support 2D canvas.');
    this.canvas = canvas;
    this.ctx = ctx;
    this.interaction = new Interaction(canvas);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);

    // Anything that changes what is on screen schedules a redraw.
    const redraw = () => this.requestRender();
    const offs = [
      useUIStore.subscribe((s, p) => {
        if (s.viewport !== p.viewport || s.wireDraft !== p.wireDraft || s.hoverPin !== p.hoverPin) redraw();
      }),
      useCircuitStore.subscribe((s, p) => {
        if (s.gates !== p.gates || s.wires !== p.wires) redraw();
      }),
      useSelectionStore.subscribe((s, p) => {
        if (s.gateIds !== p.gateIds || s.wireIds !== p.wireIds) redraw();
      }),
      useSimulationStore.subscribe(redraw),
    ];
    this.unsubscribe = () => offs.forEach((off) => off());

    this.resize();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.unsubscribe();
    this.interaction.destroy();
  }

  private resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const w = r.width;
    const h = r.height;
    this.canvas.width = Math.max(1, Math.round(w * (window.devicePixelRatio || 1)));
    this.canvas.height = Math.max(1, Math.round(h * (window.devicePixelRatio || 1)));
    this.dpr = this.canvas.width / (w || 1); // the exact ratio, so nothing is stretched

    const store = useUIStore.getState();
    store.setCanvasSize({ w, h });
    if (!this.measured && w > 0 && h > 0) {
      this.measured = true;
      store.setViewport(centerViewport({ w, h })); // start with the origin in the middle
    } else if (this.measured && r.left !== this.left) {
      // The left edge moved because the sidebar opened or closed: shift the view by the same amount,
      // so the circuit stays exactly where it is on screen instead of sliding with the edge.
      const v = useUIStore.getState().viewport;
      store.setViewport({ ...v, x: v.x - (r.left - this.left) });
    }
    this.left = r.left;
    this.draw(); // resizing clears the canvas, so redraw now rather than flash blank for a frame
  }

  private requestRender(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private draw(): void {
    const { viewport, canvasSize, wireDraft, hoverPin } = useUIStore.getState();
    const circuit = useCircuitStore.getState();
    const selection = useSelectionStore.getState();
    const animating = render(this.ctx, {
      viewport,
      size: canvasSize,
      dpr: this.dpr,
      theme: this.theme,
      gates: circuit.gates,
      wires: circuit.wires,
      selected: new Set(selection.gateIds),
      selectedWires: new Set(selection.wireIds),
      draft: wireDraft,
      hoverPin,
      sim: useSimulationStore.getState(),
    });
    if (animating) this.requestRender();
  }
}
