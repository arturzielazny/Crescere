<script>
  import {
    activeChild,
    measurementsWithZScores,
    isActiveChildReadOnly
  } from '../stores/childStore.js';
  import { formatAge } from '../lib/zscore.js';
  import {
    isFutureDate,
    formatZScore,
    getZScoreColorClass,
    formatPercentile,
    formatDate
  } from '../lib/utils.js';
  import { t, language } from '../stores/i18n.js';

  /** Opens the edit sheet for a measurement; omitted for the print copy */
  export let onEdit = null;

  const SCORES = [
    { key: 'waz', short: 'WAZ', label: 'measurements.waz' },
    { key: 'lhaz', short: 'LAZ', label: 'measurements.lhaz' },
    { key: 'headcz', short: 'HCZ', label: 'measurements.headcz' },
    { key: 'wflz', short: 'WFL', label: 'measurements.wflz' }
  ];

  $: editable = !!onEdit && !$isActiveChildReadOnly;
  // Newest first: the latest measurement is what parents look for
  $: rows = [...$measurementsWithZScores].reverse();
  $: ageLabels = { invalid: $t('age.invalid'), month: $t('age.month'), day: $t('age.day') };

  const age = (m, labels) => (m.ageInDays !== null ? formatAge(m.ageInDays, labels) : '—');
  const cm = (v, lang) =>
    v ? new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(v) : '—';
  const grams = (v, lang) => (v ? new Intl.NumberFormat(lang).format(v) : '—');
</script>

{#if $activeChild && rows.length > 0}
  <div class="bg-white rounded-lg shadow p-4 sm:p-6">
    <h2 class="text-lg font-semibold text-gray-800 mb-1">{$t('measurements.history')}</h2>
    {#if editable}
      <p class="text-xs text-gray-500 mb-3 print:hidden">{$t('measurements.history.hint')}</p>
    {/if}

    <!-- Phones: one card per measurement -->
    <ul class="sm:hidden print:hidden divide-y divide-gray-100">
      {#each rows as m (m.id)}
        <li>
          <svelte:element
            this={editable ? 'button' : 'div'}
            type={editable ? 'button' : undefined}
            on:click={editable ? () => onEdit(m) : undefined}
            class="w-full text-left py-3 {editable ? 'hover:bg-gray-50 active:bg-gray-100' : ''}"
            role={editable ? undefined : 'group'}
          >
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-sm font-medium text-gray-800">
                {formatDate(m.date, $language)}
                {#if isFutureDate(m.date)}
                  <span
                    class="ml-1 align-middle text-[11px] font-medium text-green-800 bg-green-100 rounded px-1.5 py-0.5"
                    >{$t('measurements.planned')}</span
                  >
                {/if}
              </span>
              <span class="text-xs text-gray-500">{age(m, ageLabels)}</span>
            </div>
            <div class="mt-1 text-sm text-gray-700">
              {[
                m.weight ? `${grams(m.weight, $language)} g` : null,
                m.length ? `${cm(m.length, $language)} cm` : null,
                m.headCirc
                  ? `${cm(m.headCirc, $language)} cm ${$t('measurements.headShort')}`
                  : null
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {#each SCORES as score (score.key)}
                {#if m.zscores?.[score.key] !== null && m.zscores?.[score.key] !== undefined}
                  <span class={getZScoreColorClass(m.zscores[score.key])}>
                    {score.short}
                    {formatPercentile(m.zscores[score.key], $language)}
                  </span>
                {/if}
              {/each}
            </div>
          </svelte:element>
        </li>
      {/each}
    </ul>

    <!-- Larger screens and print: full table -->
    <div class="hidden sm:block print:block overflow-auto max-h-[32rem] print:max-h-none">
      <table class="w-full text-sm">
        <thead class="sticky top-0 z-10 bg-white">
          <tr class="border-b border-gray-200">
            <th class="text-left py-2 px-2 font-medium text-gray-600">{$t('measurements.date')}</th>
            <th class="text-left py-2 px-2 font-medium text-gray-600">{$t('measurements.age')}</th>
            <th class="text-right py-2 px-2 font-medium text-gray-600"
              >{$t('measurements.weight')}</th
            >
            <th class="text-right py-2 px-2 font-medium text-gray-600"
              >{$t('measurements.length')}</th
            >
            <th class="text-right py-2 px-2 font-medium text-gray-600">{$t('measurements.head')}</th
            >
            {#each SCORES as score (score.key)}
              <th class="text-center py-2 px-2 font-medium text-gray-600">
                <abbr title={$t(score.label)} class="no-underline">{score.short}</abbr>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each rows as m (m.id)}
            <tr
              class="border-b border-gray-100 {editable ? 'cursor-pointer hover:bg-gray-50' : ''}"
              class:bg-green-50={isFutureDate(m.date)}
              on:click={editable ? () => onEdit(m) : undefined}
            >
              <td class="py-2 px-2 text-gray-700 whitespace-nowrap">
                {#if editable}
                  <button
                    type="button"
                    class="text-left hover:underline focus:underline"
                    aria-label="{$t('measurements.edit')}: {formatDate(m.date, $language)}"
                    on:click|stopPropagation={() => onEdit(m)}
                  >
                    {formatDate(m.date, $language)}
                  </button>
                {:else}
                  {formatDate(m.date, $language)}
                {/if}
                {#if isFutureDate(m.date)}
                  <span
                    class="ml-1 text-[11px] font-medium text-green-800 bg-green-100 rounded px-1.5 py-0.5"
                    >{$t('measurements.planned')}</span
                  >
                {/if}
              </td>
              <td class="py-2 px-2 text-gray-500 whitespace-nowrap">{age(m, ageLabels)}</td>
              <td class="py-2 px-2 text-right text-gray-700">{grams(m.weight, $language)}</td>
              <td class="py-2 px-2 text-right text-gray-700">{cm(m.length, $language)}</td>
              <td class="py-2 px-2 text-right text-gray-700">{cm(m.headCirc, $language)}</td>
              {#each SCORES as score (score.key)}
                <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.[score.key])}">
                  {formatZScore(m.zscores?.[score.key])}
                  <div class="text-xs text-gray-500">
                    {formatPercentile(m.zscores?.[score.key], $language)}
                  </div>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}
