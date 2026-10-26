<script>
  import { onMount } from 'svelte';
  import { t } from '../stores/i18n.js';

  export let message = '';
  /** @type {'success' | 'error' | 'info'} */
  export let type = 'success';
  export let duration = 3000;
  /** @type {{ label: string, onClick: () => void } | null} */
  export let action = null;
  export let onClose = () => {};

  onMount(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  });

  function handleAction() {
    action?.onClick();
    onClose();
  }

  const STYLES = {
    success: {
      box: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: 'text-green-600'
    },
    error: { box: 'bg-red-50 border-red-200', text: 'text-red-800', icon: 'text-red-600' },
    info: { box: 'bg-gray-800 border-gray-800', text: 'text-white', icon: 'text-gray-300' }
  };

  $: style = STYLES[type] || STYLES.info;
</script>

<div
  class="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border sm:max-w-sm animate-slide-up print-hidden {style.box}"
  role={type === 'error' ? 'alert' : 'status'}
>
  {#if type === 'success'}
    <svg
      class="w-5 h-5 shrink-0 {style.icon}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
  {:else if type === 'error'}
    <svg
      class="w-5 h-5 shrink-0 {style.icon}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
      />
    </svg>
  {/if}
  <span class="text-sm {style.text}">{message}</span>
  {#if action}
    <button
      type="button"
      on:click={handleAction}
      class="ml-auto shrink-0 px-2 py-1 pointer-coarse:py-2 text-sm font-semibold rounded uppercase tracking-wide {type ===
      'info'
        ? 'text-blue-300 hover:bg-white/10'
        : 'text-blue-700 hover:bg-black/5'}"
    >
      {action.label}
    </button>
  {/if}
  <button
    type="button"
    on:click={onClose}
    class="{action
      ? ''
      : 'ml-auto'} shrink-0 p-1 pointer-coarse:p-2 rounded hover:bg-black/5 {style.icon}"
    aria-label={$t('share.close')}
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </button>
</div>

<style>
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.2s ease-out;
  }
</style>
