// Tests de bout en bout : le vrai jeu (version construite) piloté dans de vrais navigateurs.
//   npm run test:e2e
import { defineConfig, devices } from '@playwright/test';

const PORT = 4317;

export default defineConfig({
  testDir: 'tests-e2e',
  timeout: 90_000,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, serviceWorkers: 'block' },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } }, // Chrome, écran tactile 412 × 839
    { name: 'iphone', use: { ...devices['iPhone 13'] } }, // moteur de Safari, 390 × 664
    { name: 'petit-ecran', use: { ...devices['iPhone SE'] } }, // moteur de Safari, 320 × 568
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
  ],
});
