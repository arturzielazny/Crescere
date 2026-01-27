<script>
  import { onMount } from 'svelte';

  export let message = '';
  export let type = 'success'; // 'success' or 'error'
  export let duration = 3000;
  export let onClose = () => {};

  let visible = true;

  onMount(() => {
    const timer = setTimeout(() => {
      visible = false;
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  });

  function handleClose() {
    visible = false;
    onClose();
  }
</script>

{#if visible}
  <div
    class="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm animate-slide-up"
    class:bg-green-50={type === 'success'}
    class:border-green-200={type === 'success'}
    class:bg-red-50={type === 'error'}
    class:border-red-200={type === 'error'}
    class:border={true}
    role="alert"
  >
    {#if type === 'success'}
      <svg
        class="w-5 h-5 text-green-600 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
    {:else}
      <svg
        class="w-5 h-5 text-red-600 shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    {/if}
    <span
      class="text-sm"
      class:text-green-800={type === 'success'}
      class:text-red-800={type === 'error'}
    >
      {message}
    </span>
    <button
      on:click={handleClose}
      class="ml-auto p-1 rounded hover:bg-black/5"
      class:text-green-600={type === 'success'}
      class:text-red-600={type === 'error'}
      aria-label="Close"
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
{/if}

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
