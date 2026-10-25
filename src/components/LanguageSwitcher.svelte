<script>
  import { language, setLanguage } from '../stores/i18n.js';

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'pl', name: 'Polski' }
  ];
</script>

<div
  class="inline-flex rounded border border-gray-200 text-xs font-medium overflow-hidden"
  role="group"
  aria-label="Language / Język"
>
  {#each languages as lang (lang.code)}
    <button
      type="button"
      on:click={() => setLanguage(lang.code)}
      class="px-2 py-1 pointer-coarse:px-3 pointer-coarse:py-2 transition-colors {$language ===
      lang.code
        ? 'bg-gray-700 text-white'
        : 'text-gray-600 hover:bg-gray-100'}"
      aria-pressed={$language === lang.code}
      lang={lang.code}
      title={lang.name}
    >
      {lang.code.toUpperCase()}
    </button>
  {/each}
</div>
