<script>
  import { onMount } from 'svelte';
  import { t } from '../stores/i18n.js';

  export let onSaveAccount = () => {};

  let visible = false;
  let dismissed = false;

  const DISMISSED_KEY = 'crescere-onboarding-dismissed';

  function readDismissed() {
    try {
      return !!sessionStorage.getItem(DISMISSED_KEY);
    } catch (_err) {
      return false;
    }
  }

  onMount(() => {
    if (readDismissed()) {
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
      try {
        sessionStorage.setItem(DISMISSED_KEY, '1');
      } catch (_err) {
        // Storage blocked: the banner just comes back on the next visit
      }
    }, 300);
  }
</script>

{#if !dismissed}
  <!-- Grid rows animate to the content's real height, so long text is never clipped -->
  <div
    class="grid transition-all duration-300 ease-out"
    style="grid-template-rows: {visible ? '1fr' : '0fr'}; opacity: {visible ? '1' : '0'}"
  >
    <div class="min-h-0 overflow-hidden">
      <div
        class="mb-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-lg"
      >
        <div class="flex items-start gap-3">
          <svg
            class="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-amber-900">{$t('onboarding.guestWelcome')}</p>
            <p class="text-sm text-amber-800 mt-0.5">{$t('onboarding.guestDescription')}</p>
            <div class="mt-2.5">
              <button
                type="button"
                on:click={onSaveAccount}
                class="px-3 py-1.5 pointer-coarse:py-2 text-xs font-medium bg-amber-700 hover:bg-amber-800 text-white rounded transition-colors"
              >
                {$t('auth.claimAccount')}
              </button>
            </div>
          </div>
          <button
            type="button"
            on:click={dismiss}
            class="p-1 pointer-coarse:p-2.5 pointer-coarse:-m-1.5 text-amber-500 hover:text-amber-700 rounded flex-shrink-0"
            aria-label={$t('common.dismiss')}
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
  </div>
{/if}
