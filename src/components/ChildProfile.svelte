<script>
  import {
    activeChild,
    updateProfile,
    temporaryChildId,
    saveTemporaryChild,
    discardTemporaryChild
  } from '../stores/childStore.js';
  import { calculateAgeInDays, formatAge } from '../lib/zscore.js';
  import { t } from '../stores/i18n.js';

  $: profile = $activeChild?.profile;
  $: isTemporary = $activeChild?.id === $temporaryChildId;
  $: hasMeasurementsBeforeBirth =
    profile?.birthDate &&
    $activeChild?.measurements?.some((m) => m.date && m.date < profile.birthDate);
  $: currentAge = profile?.birthDate
    ? formatAge(calculateAgeInDays(profile.birthDate, new Date().toISOString().slice(0, 10)), {
        invalid: $t('age.invalid'),
        month: $t('age.month'),
        day: $t('age.day')
      })
    : null;

  function handleBirthDateChange(e) {
    updateProfile({ birthDate: e.target.value });
  }

  function handleSexChange(e) {
    updateProfile({ sex: parseInt(e.target.value) });
  }

  function handleNameChange(e) {
    updateProfile({ name: e.target.value });
  }

  function handleSaveChild() {
    saveTemporaryChild();
  }

  function handleDiscardChild() {
    discardTemporaryChild();
  }
</script>

<div
  class="bg-white rounded-lg shadow p-6 mb-6"
  class:ring-2={isTemporary}
  class:ring-yellow-400={isTemporary}
>
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-gray-800">{$t('profile.title')}</h2>
    {#if $activeChild}
      <div class="flex gap-2">
        {#if isTemporary}
          <button
            on:click={handleSaveChild}
            class="px-3 py-1.5 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded"
          >
            {$t('profile.save')}
          </button>
          <button
            on:click={handleDiscardChild}
            class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded"
          >
            {$t('profile.discard')}
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#if isTemporary}
    <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
      {$t('profile.temporary.hint')}
    </div>
  {/if}

  {#if !$activeChild}
    <p class="text-sm text-gray-600">{$t('profile.missingChild')}</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label for="child-name" class="block text-sm font-medium text-gray-700 mb-1">
          {$t('profile.name.label')}
        </label>
        <input
          id="child-name"
          type="text"
          value={profile?.name ?? ''}
          on:input={handleNameChange}
          placeholder={$t('profile.name.placeholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          for="child-birthdate"
          class="block text-sm font-medium mb-1"
          class:text-gray-700={!hasMeasurementsBeforeBirth}
          class:text-red-600={hasMeasurementsBeforeBirth}
        >
          {$t('profile.birthDate.label')}
        </label>
        <input
          id="child-birthdate"
          type="date"
          value={profile?.birthDate ?? ''}
          on:change={handleBirthDateChange}
          class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
          class:border-gray-300={!hasMeasurementsBeforeBirth}
          class:focus:ring-blue-500={!hasMeasurementsBeforeBirth}
          class:border-red-500={hasMeasurementsBeforeBirth}
          class:focus:ring-red-500={hasMeasurementsBeforeBirth}
          class:bg-red-50={hasMeasurementsBeforeBirth}
        />
        {#if hasMeasurementsBeforeBirth}
          <p class="mt-1 text-xs text-red-600">{$t('profile.birthDate.error')}</p>
        {/if}
      </div>

      <div>
        <span class="block text-sm font-medium text-gray-700 mb-1">
          {$t('profile.sex.label')}
        </span>
        <div class="flex gap-4 mt-2">
          <label class="inline-flex items-center">
            <input
              type="radio"
              name="sex"
              value="1"
              checked={profile?.sex === 1}
              on:change={handleSexChange}
              class="form-radio text-blue-600"
            />
            <span class="ml-2">{$t('profile.sex.male')}</span>
          </label>
          <label class="inline-flex items-center">
            <input
              type="radio"
              name="sex"
              value="2"
              checked={profile?.sex === 2}
              on:change={handleSexChange}
              class="form-radio text-pink-600"
            />
            <span class="ml-2">{$t('profile.sex.female')}</span>
          </label>
        </div>
      </div>
    </div>

    {#if currentAge}
      <div class="mt-4 text-sm text-gray-600">
        {$t('profile.age.current')} <span class="font-medium">{currentAge}</span>
      </div>
    {/if}

    {#if !profile?.birthDate || !profile?.sex}
      <p class="mt-4 text-sm text-amber-600">
        {$t('profile.age.missing')}
      </p>
    {/if}
  {/if}
</div>
