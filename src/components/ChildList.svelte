<script>
  import {
    childStore,
    setActiveChild,
    addChild,
    removeChild,
    temporaryChildId,
    sharedChildIds
  } from '../stores/childStore.js';
  import { t } from '../stores/i18n.js';
  import ConfirmModal from './ConfirmModal.svelte';

  let showDeleteModal = false;
  let deleteTargetId = null;

  function getChildLabel(child, index) {
    if (child.profile?.name?.trim()) return child.profile.name.trim();
    return `${$t('children.unnamed')} ${index + 1}`;
  }

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

  $: activeId = $childStore.activeChildId || $childStore.children[0]?.id;
</script>

<div class="bg-white rounded-lg shadow p-6 mb-6">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-gray-800">{$t('children.title')}</h2>
  </div>

  {#if $childStore.children.length === 0}
    <p class="text-sm text-gray-600 mb-3">{$t('children.empty')}</p>
  {/if}

  <div class="flex flex-wrap gap-2">
    {#each $childStore.children as child, index (child.id)}
      {@const isTemporary = child.id === $temporaryChildId}
      {@const isShared = $sharedChildIds.has(child.id)}
      <div class="relative group">
        <button
          on:click={() => setActiveChild(child.id)}
          class="px-3 py-2 pr-7 text-sm rounded border transition"
          class:bg-yellow-100={isTemporary && activeId === child.id}
          class:border-yellow-400={isTemporary && activeId === child.id}
          class:text-yellow-800={isTemporary && activeId === child.id}
          class:bg-yellow-50={isTemporary && activeId !== child.id}
          class:border-yellow-300={isTemporary && activeId !== child.id}
          class:text-yellow-700={isTemporary && activeId !== child.id}
          class:bg-purple-100={isShared && activeId === child.id}
          class:border-purple-300={isShared && activeId === child.id}
          class:text-purple-700={isShared && activeId === child.id}
          class:bg-purple-50={isShared && activeId !== child.id}
          class:border-purple-200={isShared && activeId !== child.id}
          class:text-purple-600={isShared && activeId !== child.id}
          class:bg-blue-50={!isTemporary && !isShared && activeId === child.id}
          class:border-blue-300={!isTemporary && !isShared && activeId === child.id}
          class:text-blue-700={!isTemporary && !isShared && activeId === child.id}
          class:border-gray-200={!isTemporary && !isShared && activeId !== child.id}
          class:text-gray-700={!isTemporary && !isShared && activeId !== child.id}
          title={isTemporary ? $t('children.temporary.hint') : ''}
        >
          {getChildLabel(child, index)}
          {#if isTemporary}
            <span class="ml-1 text-yellow-600">●</span>
          {/if}
          {#if isShared}
            <span class="ml-1 text-purple-500 text-xs"
              >({child._shareLabel || $t('share.live.sharedBadge')})</span
            >
          {/if}
        </button>
        {#if !isTemporary}
          <button
            on:click={(e) => handleDeleteClick(e, child.id)}
            class="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
            aria-label={isShared ? $t('share.live.remove') : $t('children.remove')}
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        {/if}
      </div>
    {/each}

    <button
      on:click={addChild}
      class="px-3 py-2 text-sm rounded border border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition"
    >
      + {$t('children.add')}
    </button>
  </div>
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
