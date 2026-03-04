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
    formatPercentile,
    formatDate
  } from '../lib/utils.js';
  import { t, language } from '../stores/i18n.js';
  import DateInput from './DateInput.svelte';
  import { SvelteMap } from 'svelte/reactivity';

  export let compact = false;

  // New measurement form
  let newDate = new Date().toISOString().slice(0, 10);
  let newWeight = '';
  let newLength = '';
  let newHeadCirc = '';

  // Soft-deleted rows: id → measurement snapshot (ephemeral, resets on page refresh)
  let softDeleted = new SvelteMap();

  $: displayRows = (() => {
    const live = $measurementsWithZScores.map((m) => ({ ...m, _softDeleted: false }));
    const deleted = [...softDeleted.values()].map((m) => ({ ...m, _softDeleted: true }));
    return [...live, ...deleted].sort((a, b) => a.date.localeCompare(b.date));
  })();

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
    const m = $measurementsWithZScores.find((x) => x.id === id);
    if (!m) return;
    softDeleted.set(id, m);
    deleteMeasurement(id);
  }

  function handleRestore(id) {
    const m = softDeleted.get(id);
    if (!m) return;
    addMeasurement({ date: m.date, weight: m.weight, length: m.length, headCirc: m.headCirc });
    softDeleted.delete(id);
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
          {#each displayRows as m (m.id)}
            <tr
              class="border-b border-gray-100"
              class:hover:bg-gray-50={!m._softDeleted}
              class:bg-green-50={!m._softDeleted && isFutureDate(m.date)}
              class:opacity-40={m._softDeleted}
            >
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                {#if $isActiveChildReadOnly || m._softDeleted}
                  <span
                    class="{compact ? 'text-xs' : 'text-sm'} {m._softDeleted
                      ? 'line-through text-gray-400'
                      : ''}">{formatDate(m.date, $language)}</span
                  >
                {:else}
                  <DateInput
                    value={m.date}
                    on:change={(e) => handleUpdate(m.id, 'date', e.detail.value)}
                    cssClass="{compact
                      ? 'w-28 text-xs'
                      : 'w-32 text-sm'} px-1 py-0.5 border border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none rounded cursor-pointer bg-transparent"
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
                {#if $isActiveChildReadOnly || m._softDeleted}
                  <span class="text-xs">{m.weight || '—'}</span>
                {:else}
                  <input
                    type="number"
                    step="1"
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
                {#if $isActiveChildReadOnly || m._softDeleted}
                  <span class="text-xs">{m.length || '—'}</span>
                {:else}
                  <input
                    type="number"
                    step="0.1"
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
                {#if $isActiveChildReadOnly || m._softDeleted}
                  <span class="text-xs">{m.headCirc || '—'}</span>
                {:else}
                  <input
                    type="number"
                    step="0.1"
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
                <td
                  class="py-2 px-2 text-center {m._softDeleted
                    ? 'text-gray-300'
                    : getZScoreColorClass(m.zscores?.waz)}"
                >
                  {formatZScore(m.zscores?.waz)}
                  {#if !m._softDeleted}
                    <div class="text-xs text-gray-500">
                      {formatPercentile(m.zscores?.waz, $language)}
                    </div>
                  {/if}
                </td>
                <td
                  class="py-2 px-2 text-center {m._softDeleted
                    ? 'text-gray-300'
                    : getZScoreColorClass(m.zscores?.lhaz)}"
                >
                  {formatZScore(m.zscores?.lhaz)}
                  {#if !m._softDeleted}
                    <div class="text-xs text-gray-500">
                      {formatPercentile(m.zscores?.lhaz, $language)}
                    </div>
                  {/if}
                </td>
                <td
                  class="py-2 px-2 text-center {m._softDeleted
                    ? 'text-gray-300'
                    : getZScoreColorClass(m.zscores?.headcz)}"
                >
                  {formatZScore(m.zscores?.headcz)}
                  {#if !m._softDeleted}
                    <div class="text-xs text-gray-500">
                      {formatPercentile(m.zscores?.headcz, $language)}
                    </div>
                  {/if}
                </td>
                <td
                  class="py-2 px-2 text-center {m._softDeleted
                    ? 'text-gray-300'
                    : getZScoreColorClass(m.zscores?.wflz)}"
                >
                  {formatZScore(m.zscores?.wflz)}
                  {#if !m._softDeleted}
                    <div class="text-xs text-gray-500">
                      {formatPercentile(m.zscores?.wflz, $language)}
                    </div>
                  {/if}
                </td>
              {/if}
              <td class={compact ? 'py-1 px-1' : 'py-2 px-2'}>
                {#if m._softDeleted}
                  <button
                    on:click={() => handleRestore(m.id)}
                    class="text-blue-500 hover:text-blue-700 text-xs whitespace-nowrap"
                    aria-label={$t('measurements.restore')}
                  >
                    ↩ {$t('measurements.restore')}
                  </button>
                {:else if !$isActiveChildReadOnly}
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
                <DateInput
                  value={newDate}
                  on:change={(e) => {
                    newDate = e.detail.value;
                  }}
                  cssClass="{compact
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
                  step="1"
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
                  step="0.1"
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
                  step="0.1"
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
