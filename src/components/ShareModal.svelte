<script>
  import { onMount } from 'svelte';
  import { t } from '../stores/i18n.js';
  import { createShare, fetchShares, revokeShare } from '../lib/api.js';
  import { generateLiveShareUrl } from '../lib/share.js';
  import ConfirmModal from './ConfirmModal.svelte';

  export let onClose = () => {};
  export let childId = '';
  export let childName = '';

  let copiedShareId = null;

  // Live mode state
  let newLabel = '';
  let shares = [];
  let loadingShares = false;
  let creating = false;
  let revokeTargetId = null;
  let showRevokeConfirm = false;

  onMount(async () => {
    if (childId) {
      await loadShares();
    }
  });

  async function loadShares() {
    loadingShares = true;
    try {
      shares = await fetchShares(childId);
    } catch (_err) {
      console.error('Failed to load shares:', _err);
    } finally {
      loadingShares = false;
    }
  }

  async function handleCreateShare() {
    if (creating) return;
    creating = true;
    try {
      await createShare(childId, newLabel.trim());
      newLabel = '';
      await loadShares();
    } catch (_err) {
      console.error('Failed to create share:', _err);
    } finally {
      creating = false;
    }
  }

  function handleRevokeClick(shareId) {
    revokeTargetId = shareId;
    showRevokeConfirm = true;
  }

  async function confirmRevoke() {
    if (!revokeTargetId) return;
    try {
      await revokeShare(revokeTargetId);
      await loadShares();
    } catch (_err) {
      console.error('Failed to revoke share:', _err);
    }
    showRevokeConfirm = false;
    revokeTargetId = null;
  }

  function cancelRevoke() {
    showRevokeConfirm = false;
    revokeTargetId = null;
  }

  async function copyLiveShareUrl(share) {
    try {
      const liveUrl = generateLiveShareUrl(share.token);
      await navigator.clipboard.writeText(liveUrl);
      copiedShareId = share.id;
      setTimeout(() => {
        copiedShareId = null;
      }, 2000);
    } catch (_err) {
      console.error('Failed to copy:', _err);
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  role="dialog"
  aria-modal="true"
  aria-labelledby="share-modal-title"
  tabindex="-1"
  on:click={onClose}
  on:keydown={(e) => e.key === 'Escape' && onClose()}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6" on:click|stopPropagation>
    <h2 id="share-modal-title" class="text-lg font-semibold text-gray-800 mb-2">
      {$t('share.live.title')}
      {#if childName}
        <span class="text-gray-500 font-normal">— {childName}</span>
      {/if}
    </h2>

    <p class="text-sm text-gray-600 mb-4">
      {$t('share.live.description')}
    </p>

    <!-- Create new share -->
    <div class="flex gap-2 mb-6">
      <input
        type="text"
        bind:value={newLabel}
        placeholder={$t('share.live.label.placeholder')}
        on:keydown={(e) => e.key === 'Enter' && handleCreateShare()}
        class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        on:click={handleCreateShare}
        disabled={creating}
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md whitespace-nowrap disabled:opacity-50"
      >
        {$t('share.live.create')}
      </button>
    </div>

    <!-- Existing shares list -->
    {#if loadingShares}
      <div class="text-center py-4 text-gray-500 text-sm">
        {$t('auth.loading')}
      </div>
    {:else if shares.length === 0}
      <p class="text-sm text-gray-500 text-center py-4">
        {$t('share.live.noShares')}
      </p>
    {:else}
      <div class="space-y-3 max-h-64 overflow-y-auto">
        {#each shares as share (share.id)}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-gray-800 truncate">
                {share.label || $t('share.live.sharedBadge')}
              </div>
              <div class="text-xs text-gray-500">
                {formatDate(share.created_at)}
              </div>
            </div>
            <div class="flex gap-2 ml-3">
              <button
                on:click={() => copyLiveShareUrl(share)}
                class="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
              >
                {copiedShareId === share.id ? $t('share.copied') : $t('share.copy')}
              </button>
              <button
                on:click={() => handleRevokeClick(share.id)}
                class="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded"
              >
                {$t('share.live.revoke')}
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <div class="flex justify-end mt-4">
      <button on:click={onClose} class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
        {$t('share.close')}
      </button>
    </div>
  </div>
</div>

{#if showRevokeConfirm}
  <ConfirmModal
    title={$t('share.live.revoke')}
    message={$t('share.live.revoke.confirm')}
    confirmLabel={$t('share.live.revoke')}
    onConfirm={confirmRevoke}
    onCancel={cancelRevoke}
  />
{/if}
