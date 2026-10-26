<script>
  import { onDestroy } from 'svelte';
  import {
    activeChild,
    updateProfile,
    removeChild,
    exampleChildId,
    sharedChildIds
  } from '../stores/childStore.js';
  import { t } from '../stores/i18n.js';
  import { calculateAgeInDays, formatAge } from '../lib/zscore.js';
  import Sheet from './Sheet.svelte';
  import DateInput from './DateInput.svelte';
  import ConfirmModal from './ConfirmModal.svelte';

  export let onClose = () => {};

  let confirmingDelete = false;

  // The name saves shortly after typing stops, on blur, and when the sheet closes
  let pendingName = null;
  let nameTimer;

  function queueName(value) {
    pendingName = value;
    clearTimeout(nameTimer);
    nameTimer = setTimeout(saveName, 600);
  }

  function saveName() {
    clearTimeout(nameTimer);
    if (pendingName === null) return;
    if (pendingName !== ($activeChild?.profile?.name ?? '')) updateProfile({ name: pendingName });
    pendingName = null;
  }

  onDestroy(saveName);

  $: child = $activeChild;
  $: isShared = !!child && $sharedChildIds.has(child.id);
  $: isExample = child?.id === $exampleChildId;
  const today = new Date().toISOString().slice(0, 10);
  $: birthDate = child?.profile?.birthDate;
  $: futureBirth = !!birthDate && birthDate > today;
  $: age =
    birthDate && !futureBirth
      ? formatAge(calculateAgeInDays(birthDate, today), {
          invalid: $t('age.invalid'),
          month: $t('age.month'),
          day: $t('age.day')
        })
      : null;

  function confirmDelete() {
    confirmingDelete = false;
    if (child) removeChild(child.id);
    onClose();
  }

  const labelClass = 'block text-xs font-medium text-gray-600 mb-1';
  const fieldClass =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500';
  const sexButton =
    'flex-1 px-3 py-2 text-sm font-medium rounded border transition-colors disabled:cursor-not-allowed';
</script>

{#if child}
  <Sheet title={$t('profile.title')} {onClose}>
    <div class="space-y-4">
      {#if isShared}
        <p class="text-sm text-purple-700 bg-purple-50 rounded px-3 py-2">
          {$t('share.live.readOnlyBanner')}
        </p>
      {/if}

      <div>
        <label for="profile-name" class={labelClass}>{$t('profile.name')}</label>
        <input
          id="profile-name"
          type="text"
          autocomplete="off"
          value={child.profile?.name ?? ''}
          on:input={(e) => queueName(e.currentTarget.value)}
          on:change={saveName}
          disabled={isShared}
          placeholder={$t('profile.name.placeholder')}
          class={fieldClass}
        />
      </div>

      <div>
        <span class={labelClass}>{$t('print.born')}</span>
        <DateInput
          ariaLabel={$t('print.born')}
          value={birthDate ?? ''}
          on:change={(e) => updateProfile({ birthDate: e.detail.value })}
          disabled={isShared}
          cssClass={fieldClass}
        />
        {#if futureBirth}
          <p class="mt-1 text-xs text-amber-700" role="alert">{$t('profile.birthDate.future')}</p>
        {:else if age}
          <p class="mt-1 text-xs text-gray-500">{$t('profile.age.current')} {age}</p>
        {/if}
      </div>

      <div>
        <span class={labelClass} id="profile-sex">{$t('print.sex')}</span>
        <div class="flex gap-2" role="radiogroup" aria-labelledby="profile-sex">
          {#each [[1, 'profile.sex.male'], [2, 'profile.sex.female']] as [value, key] (value)}
            <button
              type="button"
              role="radio"
              aria-checked={child.profile?.sex === value}
              disabled={isShared}
              on:click={() => updateProfile({ sex: value })}
              class="{sexButton} {child.profile?.sex === value
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}"
            >
              {$t(key)}
            </button>
          {/each}
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
        {#if !isExample}
          <button
            type="button"
            on:click={() => (confirmingDelete = true)}
            class="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
          >
            {isShared ? $t('share.live.remove') : $t('children.remove')}
          </button>
        {:else}
          <span></span>
        {/if}
        <button
          type="button"
          on:click={onClose}
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
        >
          {$t('profile.done')}
        </button>
      </div>
    </div>
  </Sheet>

  {#if confirmingDelete}
    <ConfirmModal
      title={isShared ? $t('share.live.remove') : $t('confirm.delete.title')}
      message={isShared ? $t('share.live.remove.confirm') : $t('confirm.delete.message')}
      confirmLabel={isShared ? $t('share.live.remove') : $t('children.remove')}
      onConfirm={confirmDelete}
      onCancel={() => (confirmingDelete = false)}
    />
  {/if}
{/if}
