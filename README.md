# ⚡ AxiomLab — Interactive Logic Circuit Engine & Simulator

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**AxiomLab** is an advanced, high-performance web application for designing, simulating, and analyzing digital logic circuits in real time. Designed with standard IEEE gate symbols, dynamic topological signal propagation, continuous feedback cycle detection, and automatic boolean expression derivation, AxiomLab combines industrial-grade hardware simulation logic with modern Apple-inspired fluid UI aesthetics.

---

## ✨ Features

- 🎨 **Apple Liquid-Glass Canvas & UI:** Crafted with fluid spring physics, dynamic backdrop-blur capsules, SF-style typography, and smooth pan/zoom viewports.
- 📐 **IEEE 91 / IEC Standard Shapes:** Full visual support for standard gates (`AND`, `OR`, `NOT`, `NAND`, `NOR`, `XOR`, `XNOR`, `BUFFER`).
- 🔄 **Sequential Circuit Support:** Memory flip-flops (`SR Latch`, `D Flip-Flop`, `JK Flip-Flop`, `T Flip-Flop`), high-frequency Clocks, and LED indicators.
- ⚡ **Live Topological Engine:** Uses Kahn's algorithm paired with BFS signal propagation for zero-latency wire evaluations. Automatically detects feedback loops (e.g., latches) and marks cyclic feedback states as `'X'` (undefined).
- 🧬 **Dynamic Traveling Wire Glow:** Signal states are visually distinct. Active high lines (`HIGH`) emit a traveling linear photon glow along orthogonal polyline paths.
- 📊 **Automated Truth Table & Boolean Logic:** Instantly compiles $2^n$ logic state tables and derives simplified Sum-of-Products (SOP) boolean equations via the Quine-McCluskey reduction algorithm.
- ⏪ **Command-Pattern Undo/Redo:** Full state history tracking (100 steps) for non-destructive circuit manipulation.
- 🔒 **Edit & Operate Modes:** Lock mode interface to prevent accidental wiring edits while toggling complex state switches.
- 💾 **Export & Storage:** Save circuits to non-volatile JSON blueprints, export clean canvas diagrams as high-resolution PNGs, or export logic tables directly to CSV.
- 📦 **Built-in Circuit Presets:** Pre-packaged circuits including Half Adders, Full Adders, 4-Bit Adders, 2-to-1 Multiplexers, SR Latches, and D Flip-Flops.

---

## 🛠️ Tech Stack

| Domain | Technology | Rationale |
|---|---|---|
| **UI Components** | **React 18** | Reactive panel encapsulation and state-synchronized component trees |
| **Canvas Graphics** | **HTML5 Canvas** | Direct pixel rendering capable of managing 100+ active gates without DOM overhead |
| **Type Safety** | **TypeScript** | Strict compile-time typing across gate inputs, output pins, and wire connection graphs |
| **Build & HMR** | **Vite** | Sub-second module replacement and optimized production bundle compilation |
| **Styling & Theme** | **Tailwind CSS v4** | Dark-mode native palette with customized spatial variables and glassmorphism support |
| **State Engine** | **Zustand** | Decoupled global store accessible inside React and pure Canvas rendering routines |
| **Animation Physics** | **Framer Motion / Lenis** | Inertial scrolling, spring physics, and fluid panel transitions |
| **Testing** | **Vitest** | Node-based headless testing suite for logic engine validation |

---

## 🏗️ Architecture & Project Structure

```
logic-gate-simulator/
├── index.html                  # Vite root entry
├── vite.config.ts              # Vite + Tailwind plugin config
├── src/
│   ├── types/                  # Shared TypeScript interfaces (gate, wire, circuit)
│   │   ├── gate.ts
│   │   ├── wire.ts
│   │   ├── circuit.ts
│   │   └── simulation.ts
│   ├── engine/                 # Pure TypeScript Logic Engine (Zero DOM dependency)
│   │   ├── gates.ts            # Truth functions and pin definitions
│   │   ├── evaluator.ts        # Kahn's topological sort & BFS propagation
│   │   ├── truthTable.ts       # Truth table generation logic
│   │   ├── booleanExpr.ts      # SOP boolean expression derivation (Quine-McCluskey)
│   │   ├── history.ts          # Command-pattern Undo/Redo stack engine
│   │   └── circuitFile.ts      # JSON schema validation and file parser
│   ├── canvas/                 # Canvas Rendering Engine
│   │   ├── renderer.ts         # Direct canvas drawing routines
│   │   ├── gateShapes.ts       # IEEE gate path generators
│   │   ├── wireRouting.ts      # Orthogonal polyline pathing
│   │   ├── hitTest.ts          # Pin, wire, and gate collision detection
│   │   ├── camera.ts          # Smooth spring pan and zoom physics
│   │   └── canvasManager.ts    # React-to-Canvas bridge controller
│   ├── store/                  # Zustand state hubs
│   │   ├── circuitStore.ts     # Gate/wire graph state and operations
│   │   ├── simulationStore.ts  # Execution runtime and clock speeds
│   │   ├── selectionStore.ts   # Selection set and multi-drag state
│   │   └── uiStore.ts          # Panel toggles, active modes, viewport
│   ├── components/             # React UI Components
│   │   ├── Header/             # Application header, toolbar, mode switch
│   │   ├── Sidebar/            # Gate palette, flip-flops, presets
│   │   ├── Canvas/             # Canvas wrapper, hints overlay, zoom controls
│   │   ├── TruthTable/         # Dynamic truth table grid & Boolean display
│   │   └── shared/             # Liquid glass modals, context menus, tooltips
│   ├── hooks/                  # Custom React synchronization hooks
│   ├── presets/                # Pre-built circuit blueprints (.json)
│   └── tests/                  # Engine unit tests
```

---

## 🚦 Getting Started

### Prerequisites

Ensure you have **Node.js 18+** installed on your system.

### Local Installation & Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/AxiomLab.git
   cd AxiomLab
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Run Unit Tests:**
   Execute engine validation tests using Vitest:
   ```bash
   npm run test
   ```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` + Drag | Canvas Pan |
| `Ctrl` + Scroll | Canvas Zoom around Cursor |
| `M` + Drag | Move Selected Gate |
| `Ctrl` + `Z` | Undo |
| `Ctrl` + `Y` / `Ctrl` + `Shift` + `Z` | Redo |
| `Delete` / `Backspace` | Remove Selected Elements |
| `Ctrl` + `A` | Select All Gates & Wires |
| `Escape` | Clear Selection / Cancel Wire Routing |
| `Ctrl` + `S` | Save Circuit Blueprint |
| `Ctrl` + `O` | Open Circuit Blueprint |

---

## 🧪 Simulation Engine Logic

1. **Graph Construction:** The circuit is converted to a directed acyclic graph (DAG) where nodes represent gates and directed edges represent wire paths.
2. **Topological Sort:** Node evaluation order is resolved using Kahn's Algorithm.
3. **Cycle Handling:** Feedback loops are detected during traversal. When an unresolved cyclic dependency is identified (e.g., an uninitialized SR Latch feedback loop), state values default to `'X'` (Undefined), preventing infinite evaluation loops.
4. **Sequential Clock Ticking:** Latches and flip-flops listen for falling/rising edges from active Clock sources, triggering edge-sensitive state updates on every tick.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
