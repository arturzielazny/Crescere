<script>
  import {
    user,
    isAuthenticated,
    isAnonymous,
    loading,
    signInWithGoogle,
    linkWithGoogle,
    signOut
  } from '../stores/authStore.js';
  import { t } from '../stores/i18n.js';

  async function handleSignIn() {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  }

  async function handleClaimAccount() {
    try {
      await linkWithGoogle();
    } catch (err) {
      console.error('Account linking failed:', err);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }

  $: userEmail = $user?.email;
  $: userName = $user?.user_metadata?.full_name || $user?.user_metadata?.name;
  $: displayName = userName || userEmail || $t('auth.anonymous');
</script>

<div class="flex items-center gap-2">
  {#if $loading}
    <span class="text-sm text-gray-500">{$t('auth.loading')}</span>
  {:else if $isAuthenticated}
    {#if $isAnonymous}
      <!-- Anonymous user - show claim account button -->
      <span class="text-sm text-gray-600 hidden sm:block">{$t('auth.anonymous')}</span>
      <button
        on:click={handleClaimAccount}
        class="px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded flex items-center gap-1.5"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {$t('auth.claimAccount')}
      </button>
    {:else}
      <!-- Authenticated user -->
      <span class="text-sm text-gray-600 hidden sm:block truncate max-w-32" title={displayName}>
        {displayName}
      </span>
      <button
        on:click={handleSignOut}
        class="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 rounded"
      >
        {$t('auth.signOut')}
      </button>
    {/if}
  {:else}
    <!-- Not authenticated -->
    <button
      on:click={handleSignIn}
      class="px-3 py-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 rounded flex items-center gap-1.5"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {$t('auth.signIn')}
    </button>
  {/if}
</div>
