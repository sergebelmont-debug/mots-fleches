import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Chemins relatifs : le jeu fonctionne quelle que soit l'adresse où il est hébergé.
  base: './',
  plugins: [react()],
  test: { include: ['tests/**/*.test.ts'] },
});
