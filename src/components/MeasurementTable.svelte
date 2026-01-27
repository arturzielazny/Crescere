<script>
  import {
    activeChild,
    measurementsWithZScores,
    addMeasurement,
    updateMeasurement,
    deleteMeasurement
  } from '../stores/childStore.js';
  import { formatAge } from '../lib/zscore.js';
  import { isFutureDate, formatZScore, getZScoreColorClass } from '../lib/utils.js';
  import { t } from '../stores/i18n.js';
  import ConfirmModal from './ConfirmModal.svelte';

  // New measurement form
  let newDate = new Date().toISOString().slice(0, 10);
  let newWeight = '';
  let newLength = '';
  let newHeadCirc = '';

  // Delete confirmation
  let deleteModalOpen = false;
  let deleteTargetId = null;

  function handleAddMeasurement() {
    // Require date and at least one measurement value
    if (!newDate) return;
    if (!newWeight && !newLength && !newHeadCirc) return;

    addMeasurement({
      date: newDate,
      weight: newWeight ? parseFloat(newWeight) : null,
      length: newLength ? parseFloat(newLength) : null,
      headCirc: newHeadCirc ? parseFloat(newHeadCirc) : null
    });

    // Reset form
    newWeight = '';
    newLength = '';
    newHeadCirc = '';
  }

  function handleUpdate(id, field, value) {
    const numValue = value === '' ? null : parseFloat(value);
    updateMeasurement(id, { [field]: field === 'date' ? value : numValue });
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

<div class="bg-white rounded-lg shadow p-6 mb-6">
  <h2 class="text-lg font-semibold text-gray-800 mb-4">{$t('measurements.title')}</h2>

  {#if !$activeChild}
    <p class="text-sm text-gray-600">{$t('measurements.missingChild')}</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200">
            <th class="text-left py-2 px-2 font-medium text-gray-600">{$t('measurements.date')}</th>
            <th class="text-left py-2 px-2 font-medium text-gray-600">{$t('measurements.age')}</th>
            <th class="text-left py-2 px-2 font-medium text-gray-600"
              >{$t('measurements.weight')}</th
            >
            <th class="text-left py-2 px-2 font-medium text-gray-600"
              >{$t('measurements.length')}</th
            >
            <th class="text-left py-2 px-2 font-medium text-gray-600">{$t('measurements.head')}</th>
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
            <th class="py-2 px-2"></th>
          </tr>
        </thead>
        <tbody>
          {#each $measurementsWithZScores as m (m.id)}
            <tr
              class="border-b border-gray-100 hover:bg-gray-50"
              class:bg-green-50={isFutureDate(m.date)}
            >
              <td class="py-2 px-2">
                <input
                  type="date"
                  value={m.date}
                  on:change={(e) => handleUpdate(m.id, 'date', e.target.value)}
                  class="w-32 px-2 py-1 border border-gray-200 rounded text-sm"
                />
              </td>
              <td class="py-2 px-2 text-gray-500">
                {m.ageInDays !== null
                  ? formatAge(m.ageInDays, {
                      invalid: $t('age.invalid'),
                      month: $t('age.month'),
                      day: $t('age.day')
                    })
                  : '—'}
              </td>
              <td class="py-2 px-2">
                <input
                  type="number"
                  step="25"
                  value={m.weight || ''}
                  on:change={(e) => handleUpdate(m.id, 'weight', e.target.value)}
                  placeholder="—"
                  class="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                />
              </td>
              <td class="py-2 px-2">
                <input
                  type="number"
                  step="0.5"
                  value={m.length || ''}
                  on:change={(e) => handleUpdate(m.id, 'length', e.target.value)}
                  placeholder="—"
                  class="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                />
              </td>
              <td class="py-2 px-2">
                <input
                  type="number"
                  step="0.5"
                  value={m.headCirc || ''}
                  on:change={(e) => handleUpdate(m.id, 'headCirc', e.target.value)}
                  placeholder="—"
                  class="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                />
              </td>
              <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.waz)}">
                {formatZScore(m.zscores?.waz)}
              </td>
              <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.lhaz)}">
                {formatZScore(m.zscores?.lhaz)}
              </td>
              <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.headcz)}">
                {formatZScore(m.zscores?.headcz)}
              </td>
              <td class="py-2 px-2 text-center {getZScoreColorClass(m.zscores?.wflz)}">
                {formatZScore(m.zscores?.wflz)}
              </td>
              <td class="py-2 px-2">
                <button
                  on:click={() => handleDelete(m.id)}
                  class="text-red-500 hover:text-red-700 text-sm"
                  aria-label={$t('measurements.delete.title')}
                >
                  ✕
                </button>
              </td>
            </tr>
          {/each}

          <!-- Add new row -->
          <tr class="bg-blue-50">
            <td class="py-2 px-2">
              <input
                type="date"
                bind:value={newDate}
                on:keydown={(e) => e.key === 'Enter' && handleAddMeasurement()}
                class="w-32 px-2 py-1 border border-blue-200 rounded text-sm"
              />
            </td>
            <td class="py-2 px-2 text-gray-400">—</td>
            <td class="py-2 px-2">
              <input
                type="number"
                step="25"
                bind:value={newWeight}
                on:keydown={(e) => e.key === 'Enter' && handleAddMeasurement()}
                placeholder="g"
                class="w-20 px-2 py-1 border border-blue-200 rounded text-sm"
              />
            </td>
            <td class="py-2 px-2">
              <input
                type="number"
                step="0.5"
                bind:value={newLength}
                on:keydown={(e) => e.key === 'Enter' && handleAddMeasurement()}
                placeholder="cm"
                class="w-20 px-2 py-1 border border-blue-200 rounded text-sm"
              />
            </td>
            <td class="py-2 px-2">
              <input
                type="number"
                step="0.5"
                bind:value={newHeadCirc}
                on:keydown={(e) => e.key === 'Enter' && handleAddMeasurement()}
                placeholder="cm"
                class="w-20 px-2 py-1 border border-blue-200 rounded text-sm"
              />
            </td>
            <td colspan="4" class="py-2 px-2"></td>
            <td class="py-2 px-2">
              <button
                on:click={handleAddMeasurement}
                class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
              >
                {$t('measurements.add')}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {#if $measurementsWithZScores.length === 0}
      <p class="text-center text-gray-500 mt-4">
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
