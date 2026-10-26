<script>
  import { CHART_GROUPS } from '../stores/chartStore.js';
  import { maxAgeInDays, activeChild, measurementsWithZScores } from '../stores/childStore.js';
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
  $: titles = { growth: growthTitles[metric], velocity: velocityTitles[metric], score: scoreTitle };

  // How many measurements this chart can plot; gain rates need two
  $: points = $measurementsWithZScores.filter((m) =>
    view === 'score' ? m.zscores?.[metric] != null : m[metric] != null
  ).length;
  $: hasProfile = !!($activeChild?.profile?.birthDate && $activeChild?.profile?.sex);
  $: emptyMessage = (() => {
    if (!hasProfile) return $t('profile.age.missing');
    if (view === 'velocity' && points < 2) return $t('chart.empty.velocity');
    if (points === 0) return $t(view === 'score' ? 'chart.empty.score' : 'chart.empty');
    return '';
  })();
</script>

<!-- Charts don't react to prop changes, so remount on every switch -->
{#key `${group}|${view}|${mode}`}
  {#if metric && emptyMessage}
    <div class="p-4">
      {#if showTitle}
        <h2 class="text-lg font-semibold text-gray-800 mb-4">{titles[view]}</h2>
      {/if}
      <div
        class="h-80 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 text-center px-6"
      >
        <svg
          class="w-8 h-8 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 3v18h18M7 15l4-4 3 3 5-6"
          />
        </svg>
        <p class="text-sm text-gray-500 max-w-xs">{emptyMessage}</p>
      </div>
    </div>
  {:else if metric}
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
