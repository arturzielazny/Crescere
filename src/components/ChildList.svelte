<script>
  import { childStore, setActiveChild, addChild, temporaryChildId } from '../stores/childStore.js';
  import { t } from '../stores/i18n.js';

  function getChildLabel(child, index) {
    if (child.profile?.name?.trim()) return child.profile.name.trim();
    return `${$t('children.unnamed')} ${index + 1}`;
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
      <button
        on:click={() => setActiveChild(child.id)}
        class="px-3 py-2 text-sm rounded border transition"
        class:bg-yellow-100={isTemporary && activeId === child.id}
        class:border-yellow-400={isTemporary && activeId === child.id}
        class:text-yellow-800={isTemporary && activeId === child.id}
        class:bg-yellow-50={isTemporary && activeId !== child.id}
        class:border-yellow-300={isTemporary && activeId !== child.id}
        class:text-yellow-700={isTemporary && activeId !== child.id}
        class:bg-blue-50={!isTemporary && activeId === child.id}
        class:border-blue-300={!isTemporary && activeId === child.id}
        class:text-blue-700={!isTemporary && activeId === child.id}
        class:border-gray-200={!isTemporary && activeId !== child.id}
        class:text-gray-700={!isTemporary && activeId !== child.id}
        title={isTemporary ? $t('children.temporary.hint') : ''}
      >
        {getChildLabel(child, index)}
        {#if isTemporary}
          <span class="ml-1 text-yellow-600">●</span>
        {/if}
      </button>
    {/each}

    <button
      on:click={addChild}
      class="px-3 py-2 text-sm rounded border border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition"
    >
      + {$t('children.add')}
    </button>
  </div>
</div>
