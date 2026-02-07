<script>
  import { user, isAuthenticated, isAnonymous, hasPassword, loading } from '../stores/authStore.js';
  import { t } from '../stores/i18n.js';

  export let onSignOut = () => {};
  /** @param {'signIn' | 'claimAccount' | 'setPassword'} mode */
  export let onOpenAuth = (_mode) => {};

  let open = false;

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }

  function handleAction(fn) {
    close();
    fn();
  }

  $: userEmail = $user?.email;
  $: userName = $user?.user_metadata?.full_name || $user?.user_metadata?.name;
  $: displayName = userName || userEmail || '';
  $: initial = displayName ? displayName.charAt(0).toUpperCase() : '';
</script>

{#if $loading}
  <div class="w-7 h-7 rounded-full bg-gray-200 animate-pulse"></div>
{:else if !$isAuthenticated}
  <!-- Not authenticated: text button -->
  <button
    on:click={() => onOpenAuth('signIn')}
    class="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded font-medium"
  >
    {$t('auth.signIn')}
  </button>
{:else}
  <!-- Authenticated: avatar button -->
  <div class="relative flex items-center gap-1.5">
    {#if $isAnonymous}
      <button
        on:click={() => onOpenAuth('claimAccount')}
        class="hidden sm:block px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
      >
        {$t('auth.claimAccount')}
      </button>
    {/if}
    <button
      on:click={toggle}
      class="relative flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        {$isAnonymous ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white'}"
      aria-label={displayName || $t('auth.anonymous')}
    >
      {#if $isAnonymous}
        <!-- Generic user icon for anonymous -->
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clip-rule="evenodd"
          />
        </svg>
        <span
          class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-white"
        ></span>
      {:else}
        {initial}
      {/if}
    </button>

    {#if open}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="fixed inset-0 z-40" on:click={close}></div>
      <div
        class="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
      >
        {#if $isAnonymous}
          <!-- Anonymous dropdown -->
          <div class="px-3 py-2 border-b border-gray-100">
            <span class="text-xs text-gray-500">{$t('auth.anonymous')}</span>
          </div>
          <button
            on:click={() => handleAction(() => onOpenAuth('claimAccount'))}
            class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {$t('auth.claimAccount')}
          </button>
          <button
            on:click={() => handleAction(() => onOpenAuth('signIn'))}
            class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {$t('auth.signIn')}
          </button>
          <div class="border-t border-gray-100 mt-1 pt-1">
            <button
              on:click={() => handleAction(onSignOut)}
              class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              {$t('auth.signOut')}
            </button>
          </div>
        {:else}
          <!-- Authenticated dropdown -->
          <div class="px-3 py-2 border-b border-gray-100">
            <span class="text-xs text-gray-500 truncate block" title={displayName}>
              {displayName}
            </span>
          </div>
          <button
            on:click={() => handleAction(() => onOpenAuth('setPassword'))}
            class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {$hasPassword ? $t('menu.password.change') : $t('menu.password.set')}
          </button>
          <div class="border-t border-gray-100 mt-1 pt-1">
            <button
              on:click={() => handleAction(onSignOut)}
              class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              {$t('auth.signOut')}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
