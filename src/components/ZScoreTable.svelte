<script>
  import { activeChild, measurementsWithZScores } from '../stores/childStore.js';
  import { formatAge } from '../lib/zscore.js';
  import {
    isFutureDate,
    formatZScore,
    getZScoreColorClass,
    formatPercentile
  } from '../lib/utils.js';
  import { t, language } from '../stores/i18n.js';
</script>

{#if $activeChild && $measurementsWithZScores.length > 0}
  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">{$t('measurements.zscores')}</h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
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
            <th class="text-center py-2 px-2 font-medium text-gray-600">
              {$t('measurements.waz')}
            </th>
            <th class="text-center py-2 px-2 font-medium text-gray-600">
              {$t('measurements.lhaz')}
            </th>
            <th class="text-center py-2 px-2 font-medium text-gray-600">
              {$t('measurements.headcz')}
            </th>
            <th class="text-center py-2 px-2 font-medium text-gray-600">
              {$t('measurements.wflz')}
            </th>
          </tr>
        </thead>
        <tbody>
          {#each $measurementsWithZScores as m (m.id)}
            <tr class="border-b border-gray-100" class:bg-green-50={isFutureDate(m.date)}>
              <td class="py-2 px-2 text-gray-700">{m.date}</td>
              <td class="py-2 px-2 text-gray-500">
                {m.ageInDays !== null
                  ? formatAge(m.ageInDays, {
                      invalid: $t('age.invalid'),
                      month: $t('age.month'),
                      day: $t('age.day')
                    })
                  : '—'}
              </td>
              <td class="py-2 px-2 text-right text-gray-700">{m.weight || '—'}</td>
              <td class="py-2 px-2 text-right text-gray-700">{m.length || '—'}</td>
              <td class="py-2 px-2 text-right text-gray-700">{m.headCirc || '—'}</td>
              <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.waz)}">
                {formatZScore(m.zscores?.waz)}
                <div class="text-xs text-gray-500">
                  {formatPercentile(m.zscores?.waz, $language)}
                </div>
              </td>
              <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.lhaz)}">
                {formatZScore(m.zscores?.lhaz)}
                <div class="text-xs text-gray-500">
                  {formatPercentile(m.zscores?.lhaz, $language)}
                </div>
              </td>
              <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.headcz)}">
                {formatZScore(m.zscores?.headcz)}
                <div class="text-xs text-gray-500">
                  {formatPercentile(m.zscores?.headcz, $language)}
                </div>
              </td>
              <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.wflz)}">
                {formatZScore(m.zscores?.wflz)}
                <div class="text-xs text-gray-500">
                  {formatPercentile(m.zscores?.wflz, $language)}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
{/if}
