<script>
  import { activeChild, addMeasurement, updateMeasurement } from '../stores/childStore.js';
  import { t, language } from '../stores/i18n.js';
  import { calculateAgeInDays, calculateZScores } from '../lib/zscore.js';
  import { parseWeight, parseCm } from '../lib/measurementInput.js';
  import { deleteMeasurementWithUndo } from '../lib/measurementActions.js';
  import Sheet from './Sheet.svelte';
  import DateInput from './DateInput.svelte';

  /** @type {{id: string, date: string, weight: number|null, length: number|null, headCirc: number|null} | null} */
  export let measurement = null;
  export let onClose = () => {};

  /** Beyond this many SDs a value is almost certainly a typo or a unit mix-up */
  const IMPLAUSIBLE_Z = 5;

  const today = new Date().toISOString().slice(0, 10);
  const isEdit = !!measurement;
  const asText = (v) => (v === null || v === undefined ? '' : String(v));

  let date = measurement?.date ?? today;
  let weightText = asText(measurement?.weight);
  let lengthText = asText(measurement?.length);
  let headText = asText(measurement?.headCirc);
  let submitted = false;
  let confirmedUnusual = false;

  $: weight = parseWeight(weightText);
  $: length = parseCm(lengthText);
  $: head = parseCm(headText);
  $: values = {
    weight: weight?.grams ?? null,
    length: length?.value ?? null,
    headCirc: head?.value ?? null
  };
  $: invalid = !weight || !length || !head;
  $: empty =
    !invalid && values.weight === null && values.length === null && values.headCirc === null;
  $: birthDate = $activeChild?.profile?.birthDate;
  $: sex = $activeChild?.profile?.sex;
  $: beforeBirth = !!birthDate && date < birthDate;
  $: zscores =
    birthDate && sex && !beforeBirth && !invalid
      ? calculateZScores(values, sex, calculateAgeInDays(birthDate, date))
      : {};
  $: unusual = Object.values(zscores).some((z) => z !== null && Math.abs(z) > IMPLAUSIBLE_Z);
  // A changed value needs a fresh confirmation
  $: (values, (confirmedUnusual = false));

  $: error = (() => {
    if (!weight) return $t('measurements.invalid.weight');
    if (!length || !head) return $t('measurements.invalid.cm');
    if (beforeBirth) return $t('measurements.invalid.beforeBirth');
    if (empty && submitted) return $t('measurements.invalid.empty');
    return '';
  })();

  function save() {
    submitted = true;
    if (invalid || empty || beforeBirth) return;
    if (unusual && !confirmedUnusual) {
      confirmedUnusual = true;
      return;
    }
    const record = { date, ...values };
    if (isEdit) updateMeasurement(measurement.id, record);
    else addMeasurement(record);
    onClose();
  }

  function handleDelete() {
    deleteMeasurementWithUndo(measurement.id);
    onClose();
  }

  const labelClass = 'block text-xs font-medium text-gray-600 mb-1';
  const fieldClass =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';
</script>

<Sheet title={isEdit ? $t('measurements.edit') : $t('measurements.addTitle')} {onClose}>
  <form class="space-y-4" on:submit|preventDefault={save} novalidate>
    <div>
      <span class={labelClass}>{$t('measurements.date')}</span>
      <DateInput
        ariaLabel={$t('measurements.date')}
        value={date}
        on:change={(e) => (date = e.detail.value)}
        cssClass={fieldClass}
      />
      {#if date > today}
        <p class="mt-1 text-xs text-gray-500">{$t('measurements.plannedHint')}</p>
      {/if}
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div>
        <label for="m-weight" class={labelClass}>{$t('measurements.weightLabel')}</label>
        <input
          id="m-weight"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          bind:value={weightText}
          placeholder={$t('measurements.weightPlaceholder')}
          class={fieldClass}
          data-autofocus
        />
      </div>
      <div>
        <label for="m-length" class={labelClass}>{$t('measurements.lengthLabel')}</label>
        <input
          id="m-length"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          bind:value={lengthText}
          placeholder="cm"
          class={fieldClass}
        />
      </div>
      <div>
        <label for="m-head" class={labelClass}>{$t('measurements.headLabel')}</label>
        <input
          id="m-head"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          bind:value={headText}
          placeholder="cm"
          class={fieldClass}
        />
      </div>
    </div>

    {#if weight?.fromKg}
      <p class="-mt-2 text-xs text-gray-500">
        = {new Intl.NumberFormat($language).format(weight.grams)} g
      </p>
    {/if}

    {#if error}
      <p class="text-sm text-red-600" role="alert">{error}</p>
    {:else if unusual && confirmedUnusual}
      <p class="text-sm text-amber-800 bg-amber-50 rounded px-3 py-2" role="alert">
        {$t('measurements.unusual')}
      </p>
    {/if}

    <div class="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
      {#if isEdit}
        <button
          type="button"
          on:click={handleDelete}
          class="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
        >
          {$t('measurements.delete.title')}
        </button>
      {:else}
        <span></span>
      {/if}
      <div class="flex gap-2">
        <button
          type="button"
          on:click={onClose}
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
        >
          {$t('confirm.cancel')}
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-sm font-medium text-white rounded {unusual && confirmedUnusual
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-blue-600 hover:bg-blue-700'}"
        >
          {unusual && confirmedUnusual ? $t('measurements.saveAnyway') : $t('measurements.save')}
        </button>
      </div>
    </div>
  </form>
</Sheet>
