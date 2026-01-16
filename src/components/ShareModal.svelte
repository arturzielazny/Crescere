<script>
  import { t } from '../stores/i18n.js';

  export let url = '';
  export let onClose = () => {};

  let copied = false;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  role="dialog"
  aria-modal="true"
  aria-labelledby="share-modal-title"
  tabindex="-1"
  on:click={onClose}
  on:keydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" on:click|stopPropagation>
    <h2 id="share-modal-title" class="text-lg font-semibold text-gray-800 mb-2">
      {$t('share.title')}
    </h2>

    <p class="text-sm text-gray-600 mb-4">
      {$t('share.description')}
    </p>

    <div class="flex gap-2 mb-4">
      <input
        type="text"
        readonly
        value={url}
        class="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono truncate"
      />
      <button
        on:click={copyToClipboard}
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md whitespace-nowrap"
      >
        {copied ? $t('share.copied') : $t('share.copy')}
      </button>
    </div>

    <div class="text-xs text-gray-500 mb-4">
      {$t('share.urlLength')}: {url.length} {$t('share.chars')}
    </div>

    <div class="flex justify-end">
      <button
        on:click={onClose}
        class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
      >
        {$t('share.close')}
      </button>
    </div>
  </div>
</div>
