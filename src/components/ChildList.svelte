<script>
  import { childStore, setActiveChild, addChild, removeChild } from '../stores/childStore.js';
  import { t } from '../stores/i18n.js';

  function getChildLabel(child, index) {
    if (child.profile?.name?.trim()) return child.profile.name.trim();
    return `${$t('children.unnamed')} ${index + 1}`;
  }

  $: activeId = $childStore.activeChildId || $childStore.children[0]?.id;

  function handleRemove(event, childId) {
    event.stopPropagation();
    if (confirm($t('children.remove.confirm'))) {
      removeChild(childId);
    }
  }
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
      <div class="relative">
        <button
          on:click={() => setActiveChild(child.id)}
          class="px-3 py-2 text-sm rounded border transition"
          class:bg-blue-50={activeId === child.id}
          class:border-blue-300={activeId === child.id}
          class:text-blue-700={activeId === child.id}
          class:border-gray-200={activeId !== child.id}
          class:text-gray-700={activeId !== child.id}
        >
          {getChildLabel(child, index)}
        </button>
        <button
          type="button"
          on:click={(event) => handleRemove(event, child.id)}
          class="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-red-600 flex items-center justify-center leading-none text-base"
          title={$t('children.remove')}
          aria-label={$t('children.remove')}
        >
          ×
        </button>
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
