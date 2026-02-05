/** @type {import('knip').KnipConfig} */
export default {
  entry: ['src/main.js'],
  project: ['src/**/*.{js,svelte}'],
  ignore: ['src/data/**'],
  ignoreDependencies: [
    // Tailwind v4 uses vite plugin, no config file for knip to detect
    'tailwindcss'
  ]
};
