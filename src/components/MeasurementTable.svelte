<script>
  import {
    activeChild,
    measurementsWithZScores,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement,
    isActiveChildReadOnly
  } from '../stores/childStore.js';
  import { formatAge } from '../lib/zscore.js';
  import {
    isFutureDate,
    formatZScore,
    getZScoreColorClass,
    formatPercentile
  } from '../lib/utils.js';
  import { t, language } from '../stores/i18n.js';
  import ConfirmModal from './ConfirmModal.svelte';

  export let compact = false;

  // New measurement form
  let newDate = new Date().toISOString().slice(0, 10);
  let newWeight = '';
  let newLength = '';
  let newHeadCirc = '';

  // Delete confirmation
  let deleteModalOpen = false;
  let deleteTargetId = null;

  function toNumberOrNull(value) {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function handleAddMeasurement() {
    if (!newDate) return;
    if (!newWeight && !newLength && !newHeadCirc) return;

    addMeasurement({
      date: newDate,
      weight: toNumberOrNull(newWeight),
      length: toNumberOrNull(newLength),
      headCirc: toNumberOrNull(newHeadCirc)
    });

    newWeight = '';
    newLength = '';
    newHeadCirc = '';
  }

  function handleUpdate(id, field, value) {
    const nextValue = field === 'date' ? value : toNumberOrNull(value);
    updateMeasurement(id, { [field]: nextValue });
  }

  function handleDelete(id) {
    deleteTargetId = id;
    deleteModalOpen = true;
  }

  function confirmDelete() {
    if (deleteTargetId) {
      deleteMeasurement(deleteTargetId);
    }
    deleteModalOpen = false;
    deleteTargetId = null;
  }

  function cancelDelete() {
    deleteModalOpen = false;
    deleteTargetId = null;
  }
</script>

<div class={compact ? '' : 'bg-white rounded-lg shadow p-6 mb-6'}>
  {#if !compact}
    <h2 class="text-lg font-semibold text-gray-800 mb-4">{$t('measurements.title')}</h2>
  {/if}

  {#if !$activeChild}
    <p class="text-sm text-gray-600">{$t('measurements.missingChild')}</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200">
            <th
              class="text-left {compact
                ? 'py-1 px-1 text-xs'
                : 'py-2 px-2'} font-medium text-gray-600">{$t('measurements.date')}</th
            >
            {#if !compact}
              <th class="text-left py-2 px-2 font-medium text-gray-600">{$t('measurements.age')}</th
              >
            {/if}
            <th
              class="text-left {compact
                ? 'py-1 px-1 text-xs'
                : 'py-2 px-2'} font-medium text-gray-600">{$t('measurements.weight')}</th
            >
            <th
              class="text-left {compact
                ? 'py-1 px-1 text-xs'
                : 'py-2 px-2'} font-medium text-gray-600">{$t('measurements.length')}</th
            >
            <th
              class="text-left {compact
                ? 'py-1 px-1 text-xs'
                : 'py-2 px-2'} font-medium text-gray-600">{$t('measurements.head')}</th
            >
            {#if !compact}
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
            {/if}
            <th class={compact ? 'py-1 px-1' : 'py-2 px-2'}></th>
          </tr>
        </thead>
        <tbody>
          {#each $measurementsWithZScores as m (m.id)}
            <tr
              class="border-b border-gray-100 hover:bg-gray-50"
              class:bg-green-50={isFutureDate(m.date)}
            >
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                {#if $isActiveChildReadOnly}
                  <span class="text-xs">{m.date}</span>
                {:else}
                  <input
                    type="date"
                    value={m.date}
                    on:change={(e) => handleUpdate(m.id, 'date', e.target.value)}
                    class="{compact
                      ? 'w-28 text-xs'
                      : 'w-32 text-sm'} px-1 py-0.5 border border-gray-200 rounded"
                  />
                {/if}
              </td>
              {#if !compact}
                <td class="py-2 px-2 text-gray-500">
                  {m.ageInDays !== null
                    ? formatAge(m.ageInDays, {
                        invalid: $t('age.invalid'),
                        month: $t('age.month'),
                        day: $t('age.day')
                      })
                    : '—'}
                </td>
              {/if}
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                {#if $isActiveChildReadOnly}
                  <span class="text-xs">{m.weight || '—'}</span>
                {:else}
                  <input
                    type="number"
                    step="25"
                    value={m.weight || ''}
                    on:change={(e) => handleUpdate(m.id, 'weight', e.target.value)}
                    placeholder="—"
                    class="{compact
                      ? 'w-14 text-xs'
                      : 'w-20 text-sm'} px-1 py-0.5 border border-gray-200 rounded"
                  />
                {/if}
              </td>
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                {#if $isActiveChildReadOnly}
                  <span class="text-xs">{m.length || '—'}</span>
                {:else}
                  <input
                    type="number"
                    step="0.5"
                    value={m.length || ''}
                    on:change={(e) => handleUpdate(m.id, 'length', e.target.value)}
                    placeholder="—"
                    class="{compact
                      ? 'w-14 text-xs'
                      : 'w-20 text-sm'} px-1 py-0.5 border border-gray-200 rounded"
                  />
                {/if}
              </td>
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                {#if $isActiveChildReadOnly}
                  <span class="text-xs">{m.headCirc || '—'}</span>
                {:else}
                  <input
                    type="number"
                    step="0.5"
                    value={m.headCirc || ''}
                    on:change={(e) => handleUpdate(m.id, 'headCirc', e.target.value)}
                    placeholder="—"
                    class="{compact
                      ? 'w-14 text-xs'
                      : 'w-20 text-sm'} px-1 py-0.5 border border-gray-200 rounded"
                  />
                {/if}
              </td>
              {#if !compact}
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
              {/if}
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                {#if !$isActiveChildReadOnly}
                  <button
                    on:click={() => handleDelete(m.id)}
                    class="text-red-500 hover:text-red-700 text-xs"
                    aria-label={$t('measurements.delete.title')}
                  >
                    ✕
                  </button>
                {/if}
              </td>
            </tr>
          {/each}

          <!-- Add new row (hidden for read-only) -->
          {#if !$isActiveChildReadOnly}
            <tr class="bg-blue-50">
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                <input
                  type="date"
                  bind:value={newDate}
                  on:keydown={(e) => e.key === 'Enter' && handleAddMeasurement()}
                  class="{compact
                    ? 'w-28 text-xs'
                    : 'w-32 text-sm'} px-1 py-0.5 border border-blue-200 rounded"
                />
              </td>
              {#if !compact}
                <td class="py-2 px-2 text-gray-400">—</td>
              {/if}
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                <input
                  type="number"
                  step="25"
                  bind:value={newWeight}
                  on:keydown={(e) => e.key === 'Enter' && handleAddMeasurement()}
                  placeholder="g"
                  class="{compact
                    ? 'w-14 text-xs'
                    : 'w-20 text-sm'} px-1 py-0.5 border border-blue-200 rounded"
                />
              </td>
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                <input
                  type="number"
                  step="0.5"
                  bind:value={newLength}
                  on:keydown={(e) => e.key === 'Enter' && handleAddMeasurement()}
                  placeholder="cm"
                  class="{compact
                    ? 'w-14 text-xs'
                    : 'w-20 text-sm'} px-1 py-0.5 border border-blue-200 rounded"
                />
              </td>
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                <input
                  type="number"
                  step="0.5"
                  bind:value={newHeadCirc}
                  on:keydown={(e) => e.key === 'Enter' && handleAddMeasurement()}
                  placeholder="cm"
                  class="{compact
                    ? 'w-14 text-xs'
                    : 'w-20 text-sm'} px-1 py-0.5 border border-blue-200 rounded"
                />
              </td>
              {#if !compact}
                <td colspan="4" class="py-2 px-2"></td>
              {/if}
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                <button
                  on:click={handleAddMeasurement}
                  class="bg-blue-500 text-white px-2 py-0.5 rounded text-xs hover:bg-blue-600"
                >
                  {compact ? '+' : $t('measurements.add')}
                </button>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    {#if $measurementsWithZScores.length === 0}
      <p class="text-center text-gray-500 mt-4 text-sm">
        {$t('measurements.empty')}
      </p>
    {/if}
  {/if}
</div>

{#if deleteModalOpen}
  <ConfirmModal
    title={$t('confirm.measurement.title')}
    message={$t('confirm.measurement.message')}
    confirmLabel={$t('measurements.delete.title')}
    onConfirm={confirmDelete}
    onCancel={cancelDelete}
  />
{/if}
