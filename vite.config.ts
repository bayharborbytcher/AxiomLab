/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative base so the build works on GitHub Pages under /<repo-name>/
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
