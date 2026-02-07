<script>
  import { onMount } from 'svelte';
  import { t } from '../stores/i18n.js';

  export let onSaveAccount = () => {};
  export let hasRealChildren = false;

  let visible = false;
  let dismissed = false;

  const DISMISSED_KEY = 'crescere-onboarding-dismissed';

  onMount(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) {
      dismissed = true;
      return;
    }
    const timer = setTimeout(() => {
      visible = true;
    }, 400);
    return () => clearTimeout(timer);
  });

  function dismiss() {
    visible = false;
    setTimeout(() => {
      dismissed = true;
      sessionStorage.setItem(DISMISSED_KEY, '1');
    }, 300);
  }
</script>

{#if !dismissed}
  <div
    class="transition-all duration-300 ease-out overflow-hidden"
    style="max-height: {visible ? '10rem' : '0'}; opacity: {visible ? '1' : '0'}"
  >
    <div
      class="mb-4 p-4 bg-gradient-to-r {hasRealChildren
        ? 'from-amber-50 to-yellow-50 border-amber-200/60'
        : 'from-emerald-50 to-teal-50 border-emerald-200/60'} border rounded-lg"
    >
      <div class="flex items-start gap-3">
        {#if hasRealChildren}
          <svg
            class="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        {:else}
          <svg
            class="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        {/if}
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium {hasRealChildren ? 'text-amber-900' : 'text-emerald-900'}">
            {hasRealChildren ? $t('onboarding.guestWelcome') : $t('onboarding.welcome')}
          </p>
          <p class="text-sm {hasRealChildren ? 'text-amber-700' : 'text-emerald-700'} mt-0.5">
            {hasRealChildren ? $t('onboarding.guestDescription') : $t('onboarding.description')}
          </p>
          <div class="mt-2.5">
            <button
              on:click={onSaveAccount}
              class="px-3 py-1.5 text-xs font-medium {hasRealChildren
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded transition-colors"
            >
              {$t('onboarding.saveAccount')}
            </button>
          </div>
        </div>
        <button
          on:click={dismiss}
          class="p-1 {hasRealChildren
            ? 'text-amber-400 hover:text-amber-600'
            : 'text-emerald-400 hover:text-emerald-600'} rounded flex-shrink-0"
          aria-label="Dismiss"
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
    </div>
  </div>
{/if}
