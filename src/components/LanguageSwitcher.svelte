<script>
  import { language, setLanguage } from '../stores/i18n.js';

  const languages = [
    { code: 'en', flag: '🇬🇧' },
    { code: 'pl', flag: '🇵🇱' }
  ];
</script>

<div class="flex items-center gap-0.5">
  {#each languages as lang (lang.code)}
    <button
      on:click={() => setLanguage(lang.code)}
      class="text-lg leading-none px-1 py-0.5 rounded transition-opacity {$language === lang.code
        ? 'opacity-100'
        : 'opacity-40 hover:opacity-70'}"
      aria-label={lang.code.toUpperCase()}
      title={lang.code.toUpperCase()}
    >
      {lang.flag}
    </button>
  {/each}
</div>
