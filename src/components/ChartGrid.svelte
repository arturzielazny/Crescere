<script>
  import { chartOrder, reorderCharts } from '../stores/chartStore.js';
  import { maxAgeInDays } from '../stores/childStore.js';
  import { t } from '../stores/i18n.js';
  import GrowthMetricChart from './GrowthMetricChart.svelte';
  import ZScoreChart from './ZScoreChart.svelte';
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

<div class="flex flex-col gap-6 mt-6">
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
        {/each}
      </div>
    </div>
  {/each}
</div>
