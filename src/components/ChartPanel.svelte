<script>
  import {
    CHART_GROUPS,
    GROUP_IDS,
    VIEW_IDS,
    chartView,
    chartDisplayMode,
    maximizedChart,
    closeMaximize,
    selectChartGroup,
    selectChartView
  } from '../stores/chartStore.js';
  import { t } from '../stores/i18n.js';
  import { dialog } from '../lib/dialog.js';
  import ChartView from './ChartView.svelte';

  /** While true, every chart is rendered for the print layout */
  export let printing = false;

  $: group = $chartView.group;
  $: view = $chartView.view;
  $: views = VIEW_IDS.filter((v) => CHART_GROUPS[group][v]);

  function viewLabel(v, mode) {
    if (v === 'score')
      return $t(mode === 'percentile' ? 'chart.view.percentile' : 'chart.view.zscore');
    return $t(`chart.view.${v}`);
  }

  // Let "Weight/length" wrap after the slash in the narrow phone grid
  function tabLabel(id, translate) {
    return translate(`chart.tab.${id}`).replaceAll('/', '/\u200b');
  }

  /** Arrow keys move between tabs, as in a native tab bar */
  function handleTabKeydown(event, ids, select) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const buttons = [...event.currentTarget.parentElement.querySelectorAll('button')];
    const next = (buttons.indexOf(event.currentTarget) + step + ids.length) % ids.length;
    select(ids[next]);
    buttons[next].focus();
  }

  const tabBase =
    'px-1.5 sm:px-3 py-1.5 pointer-coarse:py-2 text-sm leading-tight font-medium rounded-md text-center min-w-0 sm:whitespace-nowrap transition-colors';
</script>

<section
  id="charts"
  class="bg-white rounded-lg shadow border border-gray-200 print-hidden"
  aria-label={$t('chart.section')}
>
  <div class="flex flex-wrap items-center justify-between gap-2 px-3 pt-3">
    <div class="grid grid-cols-4 gap-1 w-full sm:flex sm:w-auto" role="tablist">
      {#each GROUP_IDS as id (id)}
        <button
          type="button"
          role="tab"
          aria-selected={group === id}
          tabindex={group === id ? 0 : -1}
          on:click={() => selectChartGroup(id)}
          on:keydown={(e) => handleTabKeydown(e, GROUP_IDS, selectChartGroup)}
          class="{tabBase} {group === id
            ? 'bg-blue-600 text-white'
            : 'text-gray-600 hover:bg-gray-100'}"
        >
          {tabLabel(id, $t)}
        </button>
      {/each}
    </div>

    <div class="flex items-center gap-2">
      {#if views.length > 1}
        <div
          class="inline-flex rounded-md border border-gray-200 p-0.5 bg-gray-50"
          role="group"
          aria-label={$t('chart.view.label')}
        >
          {#each views as v (v)}
            <button
              type="button"
              aria-pressed={view === v}
              on:click={() => selectChartView(v)}
              class="px-2.5 py-1 pointer-coarse:py-1.5 text-xs font-medium rounded whitespace-nowrap {view ===
              v
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'}"
            >
              {viewLabel(v, $chartDisplayMode)}
            </button>
          {/each}
        </div>
      {/if}
      <button
        type="button"
        on:click={() => maximizedChart.set(true)}
        class="p-1.5 pointer-coarse:p-2 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100"
        title={$t('chart.maximize')}
        aria-label={$t('chart.maximize')}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>
  </div>

  <div role="tabpanel">
    <ChartView {group} {view} mode={$chartDisplayMode} showTitle={false} />
  </div>
</section>

{#if printing}
  <!-- Print layout: every chart, grouped. Rendered (visibly) only while printing,
       because Chart.js can't size a canvas inside a hidden container. -->
  <div class="print-only-charts flex flex-col gap-6">
    {#each GROUP_IDS as id (id)}
      <div class="bg-white rounded-lg border border-gray-200 print-chart-group">
        <h3 class="px-4 pt-3 text-sm font-semibold text-gray-700">{$t(`chart.group.${id}`)}</h3>
        {#each VIEW_IDS.filter((v) => CHART_GROUPS[id][v]) as v (v)}
          <ChartView group={id} view={v} mode={$chartDisplayMode} animate={false} />
        {/each}
      </div>
    {/each}
  </div>
{/if}

{#if $maximizedChart}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center print-hidden"
    style="padding: 5vh 5vw;"
    on:click={closeMaximize}
    use:dialog={{ onClose: closeMaximize }}
    role="dialog"
    aria-modal="true"
    aria-label={$t('chart.section')}
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="bg-white rounded-lg shadow-xl w-full h-full overflow-auto relative"
      on:click|stopPropagation
      role="document"
    >
      <button
        type="button"
        on:click={closeMaximize}
        class="absolute top-3 right-3 z-10 p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
        title={$t('chart.minimize')}
        aria-label={$t('chart.minimize')}
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
      <div class="p-6 h-full maximized-chart">
        <ChartView {group} {view} mode={$chartDisplayMode} />
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.maximized-chart .h-80) {
    height: calc(90vh - 6rem);
  }
</style>
