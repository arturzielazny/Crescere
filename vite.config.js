import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    svelte(),
    tailwindcss(),
    process.env.ANALYZE &&
      visualizer({
        filename: 'reports/bundle.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      })
  ].filter(Boolean),
  base: '/Crescere/',
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'reports/coverage',
      include: ['src/**/*.{js,svelte}'],
      exclude: ['src/data/**', 'src/**/*.test.js', 'src/**/__mocks__/**'],
      thresholds: {
        statements: 30,
        branches: 25,
        functions: 30,
        lines: 30
      }
    }
  }
});
