<script>
  import {
    childStore,
    activeChild,
    setActiveChild,
    addChild,
    removeChild,
    updateProfile,
    exampleChildId,
    sharedChildIds
  } from '../stores/childStore.js';
  import { calculateAgeInDays, formatAge } from '../lib/zscore.js';
  import { t } from '../stores/i18n.js';
  import ConfirmModal from './ConfirmModal.svelte';

  export let onShare = () => {};
  export let onPrint = () => {};

  let showDeleteModal = false;
  let deleteTargetId = null;

  function handleDeleteClick(event, childId) {
    event.stopPropagation();
    deleteTargetId = childId;
    showDeleteModal = true;
  }

  function confirmDelete() {
    if (deleteTargetId) {
      removeChild(deleteTargetId);
    }
    showDeleteModal = false;
    deleteTargetId = null;
  }

  function cancelDelete() {
    showDeleteModal = false;
    deleteTargetId = null;
  }

  function handleNameChange(child, e) {
    if ($activeChild?.id !== child.id) setActiveChild(child.id);
    updateProfile({ name: e.target.value });
  }

  function handleBirthDateChange(child, e) {
    if ($activeChild?.id !== child.id) setActiveChild(child.id);
    updateProfile({ birthDate: e.target.value });
  }

  function handleSexChange(child, value) {
    if ($activeChild?.id !== child.id) setActiveChild(child.id);
    updateProfile({ sex: value });
  }

  function getAge(child) {
    if (!child.profile?.birthDate) return null;
    return formatAge(
      calculateAgeInDays(child.profile.birthDate, new Date().toISOString().slice(0, 10)),
      {
        invalid: $t('age.invalid'),
        month: $t('age.month'),
        day: $t('age.day')
      }
    );
  }

  $: activeId = $childStore.activeChildId || $childStore.children[0]?.id;
</script>

<div class="flex flex-wrap gap-3 mb-6">
  {#each $childStore.children as child (child.id)}
    {@const isActive = activeId === child.id}
    {@const isExample = child.id === $exampleChildId}
    {@const isShared = $sharedChildIds.has(child.id)}
    {@const isReadOnly = isShared}
    {@const age = getAge(child)}
    {@const hasMissingFields = !child.profile?.birthDate || !child.profile?.sex}

    <div
      class="relative bg-white rounded-lg shadow border-2 p-3 w-64 flex flex-col gap-2 transition-colors"
      class:border-blue-400={isActive && !isExample && !isShared}
      class:border-green-400={isActive && isExample}
      class:border-purple-400={isActive && isShared}
      class:border-gray-200={!isActive}
    >
      {#if isExample}
        <div class="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
          {$t('children.example.hint')}
        </div>
      {/if}

      {#if isShared}
        <div class="text-xs text-purple-700 bg-purple-50 rounded px-2 py-1">
          {$t('share.live.readOnlyBanner')}
        </div>
      {/if}

      <!-- Name -->
      <input
        type="text"
        value={child.profile?.name ?? ''}
        on:input={(e) => handleNameChange(child, e)}
        disabled={isReadOnly}
        placeholder={$t('profile.name.placeholder')}
        class="text-sm font-medium px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
      />

      <!-- Birth date -->
      <input
        type="date"
        value={child.profile?.birthDate ?? ''}
        on:change={(e) => handleBirthDateChange(child, e)}
        disabled={isReadOnly}
        class="text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
      />

      <!-- Sex -->
      <div class="flex gap-3 text-sm">
        <label class="inline-flex items-center gap-1">
          <input
            type="radio"
            name="sex-{child.id}"
            value="1"
            checked={child.profile?.sex === 1}
            on:change={() => handleSexChange(child, 1)}
            disabled={isReadOnly}
            class="form-radio text-blue-600 disabled:cursor-not-allowed"
          />
          <span>{$t('profile.sex.male')}</span>
        </label>
        <label class="inline-flex items-center gap-1">
          <input
            type="radio"
            name="sex-{child.id}"
            value="2"
            checked={child.profile?.sex === 2}
            on:change={() => handleSexChange(child, 2)}
            disabled={isReadOnly}
            class="form-radio text-pink-600 disabled:cursor-not-allowed"
          />
          <span>{$t('profile.sex.female')}</span>
        </label>
      </div>

      <!-- Age / missing fields warning -->
      {#if hasMissingFields}
        <p class="text-xs text-amber-600">{$t('profile.age.missing')}</p>
      {:else if age}
        <p class="text-xs text-gray-500">
          {$t('profile.age.current')} <span class="font-medium">{age}</span>
        </p>
      {/if}

      <!-- Actions -->
      <div class="flex gap-2 mt-1">
        {#if !isActive}
          <button
            on:click={() => setActiveChild(child.id)}
            class="flex-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors"
          >
            {$t('children.select')}
          </button>
        {:else}
          <span
            class="flex-1 px-2 py-1 text-xs font-medium text-center rounded"
            class:bg-blue-100={!isExample && !isShared}
            class:text-blue-700={!isExample && !isShared}
            class:bg-green-100={isExample}
            class:text-green-700={isExample}
            class:bg-purple-100={isShared}
            class:text-purple-700={isShared}
          >
            {$t('children.selected')}
          </span>
        {/if}
        {#if !isShared}
          <button
            on:click={(e) => {
              e.stopPropagation();
              if (!isActive) setActiveChild(child.id);
              onShare();
            }}
            class="px-2 py-1 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            aria-label={$t('app.share')}
            title={$t('app.share')}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
        {/if}
        <button
          on:click={(e) => {
            e.stopPropagation();
            if (!isActive) setActiveChild(child.id);
            onPrint();
          }}
          class="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors hidden sm:block"
          aria-label={$t('app.print')}
          title={$t('app.print')}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
        </button>
        {#if !isExample}
          <button
            on:click={(e) => handleDeleteClick(e, child.id)}
            class="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            aria-label={isShared ? $t('share.live.remove') : $t('children.remove')}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        {/if}
      </div>
    </div>
  {/each}

  <!-- Add child button -->
  <button
    on:click={addChild}
    class="w-64 rounded-lg border-2 border-dashed border-gray-300 p-3 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors flex items-center justify-center gap-1"
  >
    + {$t('children.add')}
  </button>
</div>

{#if showDeleteModal}
  {@const isSharedTarget = deleteTargetId && $sharedChildIds.has(deleteTargetId)}
  <ConfirmModal
    title={isSharedTarget ? $t('share.live.remove') : $t('confirm.delete.title')}
    message={isSharedTarget ? $t('share.live.remove.confirm') : $t('confirm.delete.message')}
    confirmLabel={isSharedTarget ? $t('share.live.remove') : $t('children.remove')}
    onConfirm={confirmDelete}
    onCancel={cancelDelete}
  />
{/if}
