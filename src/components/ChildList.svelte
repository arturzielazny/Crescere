<script>
  import {
    childStore,
    setActiveChild,
    addChild,
    exampleChildId,
    sharedChildIds
  } from '../stores/childStore.js';
  import { calculateAgeInDays, formatAge } from '../lib/zscore.js';
  import { t } from '../stores/i18n.js';

  /** Opens the profile sheet for the active child */
  export let onEditProfile = () => {};

  $: activeId = $childStore.activeChildId || $childStore.children[0]?.id;
  const today = new Date().toISOString().slice(0, 10);

  function shortAge(child) {
    const birthDate = child.profile?.birthDate;
    if (!birthDate || birthDate > today) return '';
    return formatAge(calculateAgeInDays(birthDate, today), {
      invalid: '',
      month: $t('age.month'),
      day: $t('age.day')
    });
  }

  function handleClick(childId) {
    if (childId === activeId) onEditProfile();
    else setActiveChild(childId);
  }

  function handleAdd() {
    addChild();
    onEditProfile();
  }

  const ACTIVE = {
    own: 'bg-blue-600 border-blue-600 text-white',
    example: 'bg-green-700 border-green-700 text-white',
    shared: 'bg-purple-600 border-purple-600 text-white'
  };
  const INACTIVE = {
    own: 'bg-white border-gray-200 text-gray-700 hover:border-blue-300',
    example: 'bg-white border-green-200 text-green-800 hover:border-green-400',
    shared: 'bg-white border-purple-200 text-purple-800 hover:border-purple-400'
  };
</script>

<nav class="flex flex-wrap gap-2 mb-4" aria-label={$t('children.list')}>
  {#each $childStore.children as child (child.id)}
    {@const isActive = activeId === child.id}
    {@const kind =
      child.id === $exampleChildId ? 'example' : $sharedChildIds.has(child.id) ? 'shared' : 'own'}
    {@const age = shortAge(child)}
    {@const incomplete = !child.profile?.birthDate || !child.profile?.sex}
    <button
      type="button"
      on:click={() => handleClick(child.id)}
      aria-current={isActive ? 'true' : undefined}
      title={isActive ? $t('summary.edit') : undefined}
      class="inline-flex items-center gap-1.5 max-w-full rounded-full border px-3.5 py-1.5 pointer-coarse:py-2 text-sm font-medium shadow-sm transition-colors {isActive
        ? ACTIVE[kind]
        : INACTIVE[kind]}"
    >
      {#if incomplete}
        <span class="w-2 h-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true"></span>
      {/if}
      <span class="truncate">{child.profile?.name || $t('children.unnamed')}</span>
      {#if age}
        <span class="font-normal opacity-75 whitespace-nowrap">· {age}</span>
      {/if}
      {#if kind === 'example'}
        <span class="text-xs font-normal opacity-75">({$t('children.demo')})</span>
      {:else if kind === 'shared'}
        <span class="text-xs font-normal opacity-75">({$t('share.live.sharedBadge')})</span>
      {/if}
      {#if isActive && kind !== 'shared'}
        <svg
          class="w-3.5 h-3.5 shrink-0 opacity-80"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 18l1.464-4.536z"
          />
        </svg>
      {/if}
    </button>
  {/each}

  <button
    type="button"
    on:click={handleAdd}
    class="inline-flex items-center rounded-full border-2 border-dashed border-gray-300 px-3.5 py-1 pointer-coarse:py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
  >
    + {$t('children.add')}
  </button>
</nav>
