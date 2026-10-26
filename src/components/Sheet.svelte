<script>
  import { t } from '../stores/i18n.js';
  import { dialog } from '../lib/dialog.js';

  export let title = '';
  export let onClose = () => {};

  const titleId = `sheet-title-${crypto.randomUUID()}`;
</script>

<!-- A bottom sheet on phones, a centred dialog from sm: up -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center print-hidden"
  role="dialog"
  aria-modal="true"
  aria-labelledby={titleId}
  tabindex="-1"
  on:click={onClose}
  use:dialog={{ onClose }}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="sheet-panel bg-white w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-lg shadow-xl max-h-[92vh] overflow-y-auto px-5 pt-4 sm:pt-5"
    on:click|stopPropagation
  >
    <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 sm:hidden" aria-hidden="true"></div>
    <div class="flex items-center justify-between gap-3 mb-4">
      <h2 id={titleId} class="text-lg font-semibold text-gray-800">{title}</h2>
      <button
        type="button"
        on:click={onClose}
        class="p-2 -m-2 text-gray-400 hover:text-gray-600 rounded"
        aria-label={$t('share.close')}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
    <slot />
  </div>
</div>

<style>
  /* Keep the bottom controls clear of the iPhone home indicator */
  .sheet-panel {
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
  }
</style>
