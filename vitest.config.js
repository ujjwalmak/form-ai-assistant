import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom liefert window/document/CSS für die DOM-nahen Utils (z. B. getAgentSelector)
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
  },
});
