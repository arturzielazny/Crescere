<script>
  import { CHART_GROUPS } from '../stores/chartStore.js';
  import { maxAgeInDays } from '../stores/childStore.js';
  import { t } from '../stores/i18n.js';
  import GrowthMetricChart from './GrowthMetricChart.svelte';
  import ZScoreChart from './ZScoreChart.svelte';
  import PercentileChart from './PercentileChart.svelte';
  import VelocityChart from './VelocityChart.svelte';

  /** @type {'weight' | 'length' | 'headCirc' | 'wfl'} */
  export let group = 'weight';
  /** @type {'growth' | 'score' | 'velocity'} */
  export let view = 'growth';
  /** @type {'percentile' | 'zscore'} */
  export let mode = 'percentile';
  export let showTitle = true;
  export let animate = true;

  $: metric = CHART_GROUPS[group]?.[view];

  $: growthTitles = {
    weight: $t('chart.weight.title'),
    length: $t('chart.length.title'),
    headCirc: $t('chart.head.title')
  };
  $: velocityTitles = {
    weight: $t('chart.weightVelocity.title'),
    length: $t('chart.lengthVelocity.title')
  };
  $: scoreTitle = $t(mode === 'percentile' ? `chart.${metric}.percentile` : `chart.${metric}`);
</script>

<!-- Charts don't react to prop changes, so remount on every switch -->
{#key `${group}|${view}|${mode}`}
  {#if metric}
    {#if view === 'growth'}
      <GrowthMetricChart
        {metric}
        title={growthTitles[metric]}
        unit={metric === 'weight' ? 'g' : 'cm'}
        maxAge={$maxAgeInDays}
        {showTitle}
        {animate}
      />
    {:else if view === 'velocity'}
      <VelocityChart
        {metric}
        title={velocityTitles[metric]}
        maxAge={$maxAgeInDays}
        {showTitle}
        {animate}
      />
    {:else if mode === 'percentile'}
      <PercentileChart {metric} title={scoreTitle} maxAge={$maxAgeInDays} {showTitle} {animate} />
    {:else}
      <ZScoreChart {metric} title={scoreTitle} maxAge={$maxAgeInDays} {showTitle} {animate} />
    {/if}
  {/if}
{/key}
