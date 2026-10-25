import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';

// Worker tests run inside the Workers runtime (workerd) against a local D1 database
export default defineConfig(async () => {
  const migrations = await readD1Migrations('migrations');
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } }
      })
    ],
    test: {
      include: ['worker/**/*.test.js'],
      setupFiles: ['./worker/test/apply-migrations.js']
    }
  };
});
