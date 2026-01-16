<script>
  import { t } from '../stores/i18n.js';

  export let child = null;
  export let onConfirm = () => {};
  export let onCancel = () => {};

  $: name = child?.profile?.name || $t('children.unnamed');
  $: measurementCount = child?.measurements?.length || 0;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  role="dialog"
  aria-modal="true"
  aria-labelledby="import-modal-title"
  tabindex="-1"
  on:click={onCancel}
  on:keydown={(e) => e.key === 'Escape' && onCancel()}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" on:click|stopPropagation>
    <h2 id="import-modal-title" class="text-lg font-semibold text-gray-800 mb-2">
      {$t('share.import.title')}
    </h2>

    <p class="text-sm text-gray-600 mb-4">
      {$t('share.import.description')}
    </p>

    <div class="bg-gray-50 rounded-md p-4 mb-4">
      <div class="text-sm">
        <span class="font-medium text-gray-700">{$t('share.import.name')}:</span>
        <span class="text-gray-900 ml-1">{name}</span>
      </div>
      <div class="text-sm mt-1">
        <span class="font-medium text-gray-700">{$t('share.import.measurements')}:</span>
        <span class="text-gray-900 ml-1">{measurementCount}</span>
      </div>
    </div>

    <div class="flex justify-end gap-2">
      <button
        on:click={onCancel}
        class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
      >
        {$t('share.import.cancel')}
      </button>
      <button
        on:click={onConfirm}
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
      >
        {$t('share.import.confirm')}
      </button>
    </div>
  </div>
</div>
