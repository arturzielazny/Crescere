<script>
  import { t } from '../stores/i18n.js';
  import { chartDisplayMode, toggleChartMode } from '../stores/chartStore.js';

  export let onExport = () => {};
  export let onImport = (_event) => {};
  export let onPrint = () => {};

  let open = false;

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }

  function handleAction(fn) {
    close();
    fn();
  }
</script>

<div class="relative">
  <button
    on:click={toggle}
    class="p-1.5 rounded hover:bg-gray-100"
    aria-label={$t('menu.overflow')}
  >
    <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
      <path
        d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
      />
    </svg>
  </button>

  {#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="fixed inset-0 z-40" on:click={close}></div>
    <div
      class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
    >
      <!-- Z-Score / Percentile toggle -->
      <button
        on:click={() => handleAction(toggleChartMode)}
        class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        {$chartDisplayMode === 'percentile' ? $t('menu.showZScores') : $t('menu.showPercentiles')}
      </button>

      <!-- Print (mobile only) -->
      <button
        on:click={() => handleAction(onPrint)}
        class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
      >
        {$t('app.print')}
      </button>

      <!-- Export -->
      <button
        on:click={() => handleAction(onExport)}
        class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        {$t('app.export')}
      </button>

      <!-- Import -->
      <label
        class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
      >
        {$t('app.import')}
        <input
          type="file"
          accept=".csv"
          on:change={(e) => {
            onImport(e);
            close();
          }}
          class="hidden"
        />
      </label>
    </div>
  {/if}
</div>
