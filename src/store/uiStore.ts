import { create } from 'zustand';
import { clampViewport, clampZoom } from '../canvas/grid';
import type { Point, Size, Viewport } from '../canvas/grid';
import type { BasicGateType } from '../types/gate';
import type { PinRef, WireDraft } from '../types/wire';

export type Tool = 'select' | 'wire' | 'pan';
export type Mode = 'edit' | 'operate';
export interface ContextTarget { kind: 'gate' | 'wire' | 'canvas'; id?: string }
export interface ContextMenuState { x: number; y: number; target: ContextTarget }
export interface ToastState { id: number; message: string; tone: 'info' | 'error' }

export interface PaletteDrag {
  type: BasicGateType;
  x: number; // pointer position in screen pixels
  y: number;
}

interface UIState {
  sidebarOpen: boolean;
  truthTableOpen: boolean;
  activeTool: Tool;
  mode: Mode; // 'edit' builds the circuit; 'operate' only flips the input switches
  viewport: Viewport; // screen = world * zoom + (x, y)
  canvasSize: Size; // CSS pixels, reported by CanvasManager
  paletteDrag: PaletteDrag | null; // gate being dragged out of the sidebar
  wireDraft: WireDraft | null; // wire being drawn
  hoverPin: PinRef | null; // pin under the pointer, highlighted on the canvas
  contextMenu: ContextMenuState | null; // right-click menu
  toast: ToastState | null; // short message at the bottom of the screen
  infoOpen: boolean; // gate info card expanded (true) or collapsed to a circle

  toggleSidebar: () => void;
  toggleTruthTable: () => void;
  setActiveTool: (tool: Tool) => void;
  setMode: (mode: Mode) => void;
  setViewport: (v: Viewport) => void;
  setCanvasSize: (size: Size) => void;
  setPaletteDrag: (drag: PaletteDrag | null) => void;
  setWireDraft: (draft: WireDraft | null) => void;
  setHoverPin: (pin: PinRef | null) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setInfoOpen: (open: boolean) => void;
  showToast: (message: string, tone?: 'info' | 'error') => void;
  centerOn: (world: Point) => void; // instant jump (minimap drag)
}

// Every viewport change goes through here so zoom and pan limits are always enforced.
const commit = (v: Viewport, size: Size): Viewport =>
  clampViewport({ ...v, zoom: clampZoom(v.zoom) }, size);

let toastId = 0;
let toastTimer = 0;

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  truthTableOpen: true,
  activeTool: 'select',
  mode: 'edit',
  viewport: { x: 0, y: 0, zoom: 1 },
  canvasSize: { w: 0, h: 0 },
  paletteDrag: null,
  wireDraft: null,
  hoverPin: null,
  contextMenu: null,
  toast: null,
  infoOpen: true,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleTruthTable: () => set((s) => ({ truthTableOpen: !s.truthTableOpen })),
  setActiveTool: (activeTool) => set({ activeTool }),
  setMode: (mode) => set({ mode }),
  setViewport: (v) => set((s) => ({ viewport: commit(v, s.canvasSize) })),
  setCanvasSize: (canvasSize) => set({ canvasSize }),
  setPaletteDrag: (paletteDrag) => set({ paletteDrag }),
  setWireDraft: (wireDraft) => set({ wireDraft }),
  setHoverPin: (hoverPin) => set({ hoverPin }),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  setInfoOpen: (infoOpen) => set({ infoOpen }),
  showToast: (message, tone = 'info') => {
    const id = ++toastId;
    set({ toast: { id, message, tone } });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toast: null }), 3200);
  },

  centerOn: (p) =>
    set((s) => ({
      viewport: commit(
        {
          ...s.viewport,
          x: s.canvasSize.w / 2 - p.x * s.viewport.zoom,
          y: s.canvasSize.h / 2 - p.y * s.viewport.zoom,
        },
        s.canvasSize,
      ),
    })),
}));
