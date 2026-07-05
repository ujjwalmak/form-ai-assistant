import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom liefert window/document/CSS für die DOM-nahen Utils (z. B. getAgentSelector)
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Nur die unit-testbaren Logik-Module. Ausgeklammert: fa-styles.js (CSS-String),
      // content.js (Laufzeit-Orchestrierung → E2E), fa-supabase.js/options.js (brauchen
      // chrome-Mocks → Kür, siehe docs/reference/testing-plan.md).
      include: ['fa-utils.js', 'fa-profile.js', 'fa-scanner.js', 'fa-fill.js', 'background.js'],
    },
  },
});
