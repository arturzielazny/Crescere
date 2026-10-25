/** @type {import('knip').KnipConfig} */
export default {
  entry: ['src/main.js', 'worker/index.js', 'scripts/*.js'],
  project: ['src/**/*.{js,svelte}', 'worker/**/*.js', 'scripts/**/*.js'],
  ignore: ['src/data/**'],
  ignoreDependencies: [
    // Tailwind v4 uses vite plugin, no config file for knip to detect
    'tailwindcss',
    // cloudflare:test / cloudflare:workers are runtime modules provided by workerd
    'cloudflare'
  ]
};
