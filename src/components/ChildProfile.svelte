<script>
  import { activeChild, updateProfile } from '../stores/childStore.js';
  import { calculateAgeInDays, formatAge } from '../lib/zscore.js';
  import { t } from '../stores/i18n.js';

  $: profile = $activeChild?.profile;
  $: currentAge = profile?.birthDate
    ? formatAge(
        calculateAgeInDays(profile.birthDate, new Date().toISOString().slice(0, 10)),
        { invalid: $t('age.invalid'), month: $t('age.month'), day: $t('age.day') }
      )
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
</script>

<div class="bg-white rounded-lg shadow p-6 mb-6">
  <h2 class="text-lg font-semibold text-gray-800 mb-4">{$t('profile.title')}</h2>

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
          value={profile.name}
          on:input={handleNameChange}
          placeholder={$t('profile.name.placeholder')}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label for="child-birthdate" class="block text-sm font-medium text-gray-700 mb-1">
          {$t('profile.birthDate.label')}
        </label>
        <input
          id="child-birthdate"
          type="date"
          value={profile.birthDate || ''}
          on:change={handleBirthDateChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
              checked={profile.sex === 1}
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
              checked={profile.sex === 2}
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

    {#if !profile.birthDate || !profile.sex}
      <p class="mt-4 text-sm text-amber-600">
        {$t('profile.age.missing')}
      </p>
    {/if}
  {/if}
</div>
