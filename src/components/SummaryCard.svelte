<script>
  import {
    activeChild,
    measurementsWithZScores,
    exampleChildId,
    sharedChildIds
  } from '../stores/childStore.js';
  import { selectChartGroup } from '../stores/chartStore.js';
  import { t, language } from '../stores/i18n.js';
  import { calculateAgeInDays, formatAge, getZScoreClass } from '../lib/zscore.js';
  import { formatDate, formatPercentile, formatZScore } from '../lib/utils.js';
  import { summarizeGrowth, describeZScore, SUMMARY_METRICS } from '../lib/summary.js';

  export let onEditProfile = () => {};
  export let onShare = () => {};
  export let onExplain = () => {};
  export let onAddChild = () => {};

  const DOT_CLASSES = {
    normal: 'bg-green-600',
    mild: 'bg-amber-500',
    moderate: 'bg-red-500',
    severe: 'bg-red-700',
    unknown: 'bg-gray-300'
  };

  const today = new Date().toISOString().slice(0, 10);
  $: child = $activeChild;
  $: isExample = child?.id === $exampleChildId;
  $: isShared = !!child && $sharedChildIds.has(child.id);
  $: hasProfile = !!(child?.profile?.birthDate && child?.profile?.sex);
  $: summary = summarizeGrowth($measurementsWithZScores, today);
  $: ageLabels = { invalid: $t('age.invalid'), month: $t('age.month'), day: $t('age.day') };
  $: age = hasProfile
    ? formatAge(calculateAgeInDays(child.profile.birthDate, today), ageLabels)
    : null;
  $: hasAnyMetric = SUMMARY_METRICS.some(({ id }) => summary.metrics[id]);

  function relativeDays(days, lang) {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    if (days < 45) return rtf.format(-days, 'day');
    return rtf.format(-Math.round(days / 30.4375), 'month');
  }

  function formatValue(id, value, lang) {
    if (value === null) return '';
    if (id === 'weight') return `${new Intl.NumberFormat(lang).format(value)} g`;
    const cm = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${cm.format(value)} cm`;
  }

  function formatChange(id, change, lang) {
    if (!change) return '';
    const sign = change.value > 0 ? '+' : '';
    const amount = `${sign}${formatValue(id, change.value, lang)}`;
    const text = $t('summary.change')
      .replace('{change}', amount)
      .replace('{days}', String(change.days));
    if (id !== 'weight') return text;
    const pace = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(
      change.value / change.days
    );
    return `${text} · ${$t('summary.pace.weight').replace('{value}', pace)}`;
  }

  function bandText(z) {
    const band = describeZScore(z);
    if (!band) return '';
    return $t(`summary.band.${band.direction}`).replace('{range}', band.range);
  }

  function showChart(id) {
    selectChartGroup(id);
    document.getElementById('charts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

{#if child}
  <section class="bg-white rounded-lg shadow p-4 sm:p-5 mb-6" aria-labelledby="summary-title">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h2 id="summary-title" class="text-lg font-semibold text-gray-900 truncate">
          {child.profile?.name || $t('children.unnamed')}
        </h2>
        <p class="text-sm text-gray-500">
          {#if age}{$t('profile.age.current')}
            <span class="font-medium text-gray-700">{age}</span>{/if}
          {#if summary.lastDate}
            <span aria-hidden="true" class="mx-1">·</span>{$t('summary.lastMeasured').replace(
              '{when}',
              relativeDays(summary.daysSinceLast, $language)
            )}
          {/if}
        </p>
      </div>
      <div class="flex items-center gap-1 shrink-0 print-hidden">
        {#if !isShared}
          <button
            type="button"
            on:click={onEditProfile}
            class="p-2 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            title={$t('summary.edit')}
            aria-label={$t('summary.edit')}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 18l1.464-4.536z"
              />
            </svg>
          </button>
        {/if}
        {#if !isShared && !isExample}
          <button
            type="button"
            on:click={onShare}
            class="p-2 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50"
            title={$t('app.share')}
            aria-label={$t('app.share')}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
        {/if}
      </div>
    </div>

    {#if isExample}
      <div
        class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-green-800 bg-green-50 rounded px-3 py-2 print-hidden"
      >
        <span>{$t('children.example.hint')}</span>
        <button
          type="button"
          on:click={onAddChild}
          class="px-3 py-1.5 text-xs font-medium text-white bg-green-700 hover:bg-green-800 rounded"
        >
          + {$t('children.add')}
        </button>
      </div>
    {:else if isShared}
      <p class="mt-3 text-sm text-purple-700 bg-purple-50 rounded px-3 py-2">
        {$t('share.live.readOnlyBanner')}
      </p>
    {/if}

    {#if !hasProfile}
      <div
        class="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-amber-800 bg-amber-50 rounded px-3 py-2"
      >
        <span>{$t('profile.age.missing')}</span>
        {#if !isShared}
          <button
            type="button"
            on:click={onEditProfile}
            class="px-3 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded print-hidden"
          >
            {$t('summary.completeProfile')}
          </button>
        {/if}
      </div>
    {:else if !hasAnyMetric}
      <p class="mt-4 text-sm text-gray-500">{$t('summary.empty')}</p>
    {:else}
      <ul class="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {#each SUMMARY_METRICS as { id } (id)}
          {@const metric = summary.metrics[id]}
          <li>
            <button
              type="button"
              on:click={() => showChart(id)}
              disabled={!metric}
              class="flex flex-col items-start justify-start w-full h-full text-left rounded-lg border border-gray-200 p-3 hover:border-blue-300 hover:bg-blue-50/40 transition-colors disabled:hover:bg-transparent disabled:hover:border-gray-200 disabled:cursor-default"
              aria-label="{$t(`chart.group.${id}`)}: {$t('summary.showChart')}"
            >
              <span class="block text-xs font-medium text-gray-500">{$t(`chart.group.${id}`)}</span>
              {#if metric}
                {#if metric.value !== null}
                  <span class="block text-lg font-semibold text-gray-900"
                    >{formatValue(id, metric.value, $language)}</span
                  >
                {/if}
                {#if metric.z !== null}
                  <span
                    class="flex items-center gap-1.5 text-sm text-gray-800 {metric.value === null
                      ? 'text-lg font-semibold'
                      : ''}"
                  >
                    <span
                      class="inline-block w-2.5 h-2.5 rounded-full shrink-0 {DOT_CLASSES[
                        getZScoreClass(metric.z)
                      ]}"
                      aria-hidden="true"
                    ></span>
                    {$t('summary.percentile').replace('{p}', formatPercentile(metric.z, $language))}
                  </span>
                  <span class="block text-xs text-gray-500"
                    >{bandText(metric.z)} · z {formatZScore(metric.z)}</span
                  >
                {/if}
                {#if metric.change}
                  <span class="block text-xs text-gray-500 mt-1"
                    >{formatChange(id, metric.change, $language)}</span
                  >
                {/if}
                {#if metric.date !== summary.lastDate}
                  <span class="block text-xs text-gray-400 mt-1"
                    >{formatDate(metric.date, $language)}</span
                  >
                {/if}
              {:else}
                <span class="block text-sm text-gray-400 mt-1">—</span>
              {/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="mt-3 flex justify-end print-hidden">
      <button
        type="button"
        on:click={onExplain}
        class="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {$t('summary.explain')}
      </button>
    </div>
  </section>
{/if}
