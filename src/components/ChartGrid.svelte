<script>
  import {
    chartOrder,
    columnsPerRow,
    maximizedChart,
    closeMaximize,
    reorderCharts,
    setColumnsPerRow
  } from '../stores/chartStore.js';
  import { maxAgeInDays } from '../stores/childStore.js';
  import { t } from '../stores/i18n.js';
  import GrowthMetricChart from './GrowthMetricChart.svelte';
  import ZScoreChart from './ZScoreChart.svelte';

  let draggedIndex = null;
  let dragOverIndex = null;

  $: gridClass =
    {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4'
    }[$columnsPerRow] || 'md:grid-cols-3';

  function handleDragStart(event, index) {
    draggedIndex = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  }

  function handleDragOver(event, index) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dragOverIndex = index;
  }

  function handleDragLeave() {
    dragOverIndex = null;
  }

  function handleDrop(event, toIndex) {
    event.preventDefault();
    const fromIndex = draggedIndex;
    if (fromIndex !== null && fromIndex !== toIndex) {
      reorderCharts(fromIndex, toIndex);
    }
    draggedIndex = null;
    dragOverIndex = null;
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
  }

  function handleMaximize(chartId) {
    maximizedChart.update((current) => (current === chartId ? null : chartId));
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && $maximizedChart) {
      closeMaximize();
    }
  }

  function getChartTitle(chart) {
    if (chart.type === 'growth') {
      const titles = {
        weight: $t('chart.weight.title'),
        length: $t('chart.length.title'),
        headCirc: $t('chart.head.title')
      };
      return titles[chart.id] || '';
    } else {
      const titles = {
        waz: $t('chart.waz'),
        lhaz: $t('chart.lhaz'),
        headcz: $t('chart.headcz'),
        wflz: $t('chart.wflz')
      };
      return titles[chart.id] || '';
    }
  }

  function getChartUnit(chart) {
    if (chart.type === 'growth') {
      return chart.id === 'weight' ? 'g' : 'cm';
    }
    return '';
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex items-center justify-end gap-2 mt-6 mb-2">
  <span class="text-sm text-gray-600">{$t('chart.columns')}:</span>
  {#each [2, 3, 4] as cols (cols)}
    <button
      on:click={() => setColumnsPerRow(cols)}
      class="px-2 py-1 text-sm rounded transition-colors"
      class:bg-blue-100={$columnsPerRow === cols}
      class:text-blue-700={$columnsPerRow === cols}
      class:bg-gray-100={$columnsPerRow !== cols}
      class:text-gray-600={$columnsPerRow !== cols}
      class:hover:bg-gray-200={$columnsPerRow !== cols}
    >
      {cols}
    </button>
  {/each}
</div>

<div class="grid grid-cols-1 {gridClass} gap-6">
  {#each $chartOrder as chart, index (chart.id)}
    <div
      class="relative group"
      class:opacity-50={draggedIndex === index}
      class:ring-2={dragOverIndex === index}
      class:ring-blue-400={dragOverIndex === index}
      class:ring-offset-2={dragOverIndex === index}
      draggable="true"
      on:dragstart={(e) => handleDragStart(e, index)}
      on:dragover={(e) => handleDragOver(e, index)}
      on:dragleave={handleDragLeave}
      on:drop={(e) => handleDrop(e, index)}
      on:dragend={handleDragEnd}
      role="listitem"
    >
      <div
        class="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          on:click={() => handleMaximize(chart.id)}
          class="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
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
        <div
          class="p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800 cursor-grab active:cursor-grabbing"
          title={$t('chart.drag')}
          aria-label={$t('chart.drag')}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      </div>

      {#if chart.type === 'growth'}
        <GrowthMetricChart
          metric={chart.id}
          title={getChartTitle(chart)}
          unit={getChartUnit(chart)}
          maxAge={$maxAgeInDays}
        />
      {:else}
        <ZScoreChart metric={chart.id} title={getChartTitle(chart)} maxAge={$maxAgeInDays} />
      {/if}
    </div>
  {/each}
</div>

{#if $maximizedChart}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
    on:click={closeMaximize}
    on:keydown={(e) => e.key === 'Escape' && closeMaximize()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto relative"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      <button
        on:click={closeMaximize}
        class="absolute top-2 right-2 z-10 p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
        title={$t('chart.minimize')}
        aria-label={$t('chart.minimize')}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div class="p-4 maximized-chart">
        {#each $chartOrder as chart (chart.id)}
          {#if chart.id === $maximizedChart}
            {#key $maximizedChart}
              {#if chart.type === 'growth'}
                <GrowthMetricChart
                  metric={chart.id}
                  title={getChartTitle(chart)}
                  unit={getChartUnit(chart)}
                  maxAge={$maxAgeInDays}
                />
              {:else}
                <ZScoreChart
                  metric={chart.id}
                  title={getChartTitle(chart)}
                  maxAge={$maxAgeInDays}
                />
              {/if}
            {/key}
          {/if}
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.maximized-chart .h-80) {
    height: 70vh;
  }
</style>
