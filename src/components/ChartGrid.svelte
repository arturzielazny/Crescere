<script>
  import {
    chartOrder,
    maximizedChart,
    closeMaximize,
    reorderCharts
  } from '../stores/chartStore.js';
  import { maxAgeInDays } from '../stores/childStore.js';
  import { t } from '../stores/i18n.js';
  import GrowthMetricChart from './GrowthMetricChart.svelte';
  import ZScoreChart from './ZScoreChart.svelte';
  import PercentileChart from './PercentileChart.svelte';
  import VelocityChart from './VelocityChart.svelte';

  let draggedIndex = null;
  let dragOverIndex = null;

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

  $: percentileTitles = {
    waz: $t('chart.waz.percentile'),
    lhaz: $t('chart.lhaz.percentile'),
    headcz: $t('chart.headcz.percentile'),
    wflz: $t('chart.wflz.percentile')
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

<div class="flex flex-col gap-6 mt-6">
  {#each $chartOrder as group, groupIndex (group.groupId)}
    <div
      class="group/card bg-white rounded-lg shadow border border-gray-200 print-chart-group"
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
          class="p-1.5 text-gray-400 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing rounded hover:bg-gray-100 hover:text-gray-600 print-hidden"
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
            <button
              on:click={() => handleMaximize(chart.id)}
              class="absolute top-2 right-2 z-10 p-1.5 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800 opacity-0 group-hover/chart:opacity-100 transition-opacity print-hidden"
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

            {#if chart.type === 'growth'}
              <GrowthMetricChart
                metric={chart.id}
                title={chart.type === 'percentile'
                  ? percentileTitles[chart.id]
                  : chartTitles[chart.id]}
                unit={getChartUnit(chart)}
                maxAge={$maxAgeInDays}
              />
            {:else if chart.type === 'velocity'}
              <VelocityChart
                metric={getVelocityMetric(chart.id)}
                title={chart.type === 'percentile'
                  ? percentileTitles[chart.id]
                  : chartTitles[chart.id]}
                maxAge={$maxAgeInDays}
              />
            {:else if chart.type === 'percentile'}
              <PercentileChart
                metric={chart.id}
                title={chart.type === 'percentile'
                  ? percentileTitles[chart.id]
                  : chartTitles[chart.id]}
                maxAge={$maxAgeInDays}
              />
            {:else}
              <ZScoreChart
                metric={chart.id}
                title={chart.type === 'percentile'
                  ? percentileTitles[chart.id]
                  : chartTitles[chart.id]}
                maxAge={$maxAgeInDays}
              />
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
    class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center print-hidden"
    style="padding: 5vh 5vw;"
    on:click={closeMaximize}
    on:keydown={(e) => e.key === 'Escape' && closeMaximize()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="bg-white rounded-lg shadow-xl w-full h-full overflow-auto relative"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="document"
    >
      <button
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
        {#each $chartOrder as group (group.groupId)}
          {#each group.charts as chart (chart.id)}
            {#if chart.id === $maximizedChart}
              {#key $maximizedChart}
                {#if chart.type === 'growth'}
                  <GrowthMetricChart
                    metric={chart.id}
                    title={chart.type === 'percentile'
                      ? percentileTitles[chart.id]
                      : chartTitles[chart.id]}
                    unit={getChartUnit(chart)}
                    maxAge={$maxAgeInDays}
                  />
                {:else if chart.type === 'velocity'}
                  <VelocityChart
                    metric={getVelocityMetric(chart.id)}
                    title={chart.type === 'percentile'
                      ? percentileTitles[chart.id]
                      : chartTitles[chart.id]}
                    maxAge={$maxAgeInDays}
                  />
                {:else if chart.type === 'percentile'}
                  <PercentileChart
                    metric={chart.id}
                    title={chart.type === 'percentile'
                      ? percentileTitles[chart.id]
                      : chartTitles[chart.id]}
                    maxAge={$maxAgeInDays}
                  />
                {:else}
                  <ZScoreChart
                    metric={chart.id}
                    title={chart.type === 'percentile'
                      ? percentileTitles[chart.id]
                      : chartTitles[chart.id]}
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
    height: calc(90vh - 6rem);
  }
</style>
