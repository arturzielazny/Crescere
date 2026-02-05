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
  import VelocityChart from './VelocityChart.svelte';

  let draggedIndex = null;
  let dragOverIndex = null;

  $: gridClass =
    {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4'
    }[$columnsPerRow] || 'md:grid-cols-2';

  $: chartTitles = {
    weight: $t('chart.weight.title'),
    length: $t('chart.length.title'),
    headCirc: $t('chart.head.title'),
    waz: $t('chart.waz'),
    lhaz: $t('chart.lhaz'),
    headcz: $t('chart.headcz'),
    wflz: $t('chart.wflz'),
    weightVelocity: $t('chart.weightVelocity.title'),
    lengthVelocity: $t('chart.lengthVelocity.title')
  };

  $: groupTitles = {
    weight: $t('chart.group.weight'),
    length: $t('chart.group.length'),
    headCirc: $t('chart.group.headCirc'),
    wfl: $t('chart.group.wfl')
  };

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

  function getChartUnit(chart) {
    if (chart.type === 'growth') {
      return chart.id === 'weight' ? 'g' : 'cm';
    }
    if (chart.type === 'velocity') {
      return chart.id === 'weightVelocity' ? 'g/day' : 'cm/day';
    }
    return '';
  }

  function getVelocityMetric(chartId) {
    return chartId === 'weightVelocity' ? 'weight' : 'length';
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
  {#each $chartOrder as group, groupIndex (group.groupId)}
    <div
      class="group/card bg-white rounded-lg shadow border border-gray-200"
      class:opacity-50={draggedIndex === groupIndex}
      class:ring-2={dragOverIndex === groupIndex}
      class:ring-blue-400={dragOverIndex === groupIndex}
      class:ring-offset-2={dragOverIndex === groupIndex}
      draggable="true"
      on:dragstart={(e) => handleDragStart(e, groupIndex)}
      on:dragover={(e) => handleDragOver(e, groupIndex)}
      on:dragleave={handleDragLeave}
      on:drop={(e) => handleDrop(e, groupIndex)}
      on:dragend={handleDragEnd}
      role="listitem"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 class="text-sm font-semibold text-gray-700">
          {groupTitles[group.groupId] || group.groupId}
        </h3>
        <div
          class="p-1.5 text-gray-400 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing rounded hover:bg-gray-100 hover:text-gray-600"
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

      <div class="flex flex-col">
        {#each group.charts as chart (chart.id)}
          <div class="relative group/chart">
            <div
              class="absolute top-2 right-2 z-10 opacity-0 group-hover/chart:opacity-100 transition-opacity"
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
            </div>

            {#if chart.type === 'growth'}
              <GrowthMetricChart
                metric={chart.id}
                title={chartTitles[chart.id]}
                unit={getChartUnit(chart)}
                maxAge={$maxAgeInDays}
              />
            {:else if chart.type === 'velocity'}
              <VelocityChart
                metric={getVelocityMetric(chart.id)}
                title={chartTitles[chart.id]}
                maxAge={$maxAgeInDays}
              />
            {:else}
              <ZScoreChart metric={chart.id} title={chartTitles[chart.id]} maxAge={$maxAgeInDays} />
            {/if}
          </div>
        {/each}
      </div>
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
        {#each $chartOrder as group (group.groupId)}
          {#each group.charts as chart (chart.id)}
            {#if chart.id === $maximizedChart}
              {#key $maximizedChart}
                {#if chart.type === 'growth'}
                  <GrowthMetricChart
                    metric={chart.id}
                    title={chartTitles[chart.id]}
                    unit={getChartUnit(chart)}
                    maxAge={$maxAgeInDays}
                  />
                {:else if chart.type === 'velocity'}
                  <VelocityChart
                    metric={getVelocityMetric(chart.id)}
                    title={chartTitles[chart.id]}
                    maxAge={$maxAgeInDays}
                  />
                {:else}
                  <ZScoreChart
                    metric={chart.id}
                    title={chartTitles[chart.id]}
                    maxAge={$maxAgeInDays}
                  />
                {/if}
              {/key}
            {/if}
          {/each}
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
