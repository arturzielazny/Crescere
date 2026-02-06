<script>
  import { onMount, onDestroy } from 'svelte';
  import { t } from '../stores/i18n.js';

  export let title = '';
  export let message = '';
  export let confirmLabel = '';
  export let onConfirm = () => {};
  export let onCancel = () => {};

  let modalElement;

  // Move modal to body to escape any stacking context issues
  onMount(() => {
    if (modalElement) {
      document.body.appendChild(modalElement);
    }
  });

  onDestroy(() => {
    if (modalElement && modalElement.parentNode === document.body) {
      document.body.removeChild(modalElement);
    }
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  bind:this={modalElement}
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-modal-title"
  tabindex="-1"
  on:click={onCancel}
  on:keydown={(e) => e.key === 'Escape' && onCancel()}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" on:click|stopPropagation>
    <h2 id="confirm-modal-title" class="text-lg font-semibold text-gray-800 mb-2">
      {title}
    </h2>

    <p class="text-sm text-gray-600 mb-6">
      {message}
    </p>

    <div class="flex justify-end gap-2">
      <button
        on:click={onCancel}
        class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
      >
        {$t('confirm.cancel')}
      </button>
      <button
        on:click={onConfirm}
        class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded"
      >
        {confirmLabel}
      </button>
    </div>
  </div>
</div>
