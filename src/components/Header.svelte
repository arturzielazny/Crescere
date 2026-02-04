<script>
  import {
    user,
    isAuthenticated,
    isAnonymous,
    loading,
    signInWithEmail,
    linkWithEmail
  } from '../stores/authStore.js';
  import { t } from '../stores/i18n.js';

  export let onSignOut = () => {};

  let showEmailInput = false;
  let email = '';
  let emailSent = false;
  let isLinking = false;

  function openEmailInput(linking = false) {
    isLinking = linking;
    showEmailInput = true;
    email = '';
    emailSent = false;
  }

  function closeEmailInput() {
    showEmailInput = false;
    email = '';
    emailSent = false;
    isLinking = false;
  }

  async function handleEmailSubmit() {
    if (!email) return;

    try {
      if (isLinking) {
        await linkWithEmail(email);
      } else {
        await signInWithEmail(email);
      }
      emailSent = true;
    } catch (err) {
      console.error('Email auth failed:', err);
    }
  }

  function handleSignOut() {
    onSignOut();
  }

  $: userEmail = $user?.email;
  $: userName = $user?.user_metadata?.full_name || $user?.user_metadata?.name;
  $: displayName = userName || userEmail || $t('auth.anonymous');
</script>

<div class="flex items-center gap-2 relative">
  {#if $loading}
    <span class="text-sm text-gray-500">{$t('auth.loading')}</span>
  {:else if showEmailInput}
    <div class="flex items-center gap-2">
      {#if emailSent}
        <span class="text-sm text-green-600"
          >{isLinking ? $t('auth.emailSent.claim') : $t('auth.emailSent.signIn')}</span
        >
        <button
          on:click={closeEmailInput}
          class="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      {:else}
        <input
          type="email"
          bind:value={email}
          placeholder={$t('auth.emailPlaceholder')}
          class="px-2 py-1 text-sm border border-gray-200 rounded w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
          on:keydown={(e) => e.key === 'Enter' && handleEmailSubmit()}
        />
        <button
          on:click={handleEmailSubmit}
          disabled={!email}
          class="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {$t('auth.sendLink')}
        </button>
        <button
          on:click={closeEmailInput}
          class="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      {/if}
    </div>
  {:else if $isAuthenticated}
    {#if $isAnonymous}
      <!-- Anonymous user - show claim and sign in -->
      <span class="text-sm text-gray-600 hidden sm:block">{$t('auth.anonymous')}</span>
      <button
        on:click={() => openEmailInput(true)}
        class="px-3 py-1.5 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded flex items-center gap-1.5"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        {$t('auth.claimAccount')}
      </button>
      <button
        on:click={() => openEmailInput(false)}
        class="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded"
      >
        {$t('auth.signIn')}
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
      on:click={() => openEmailInput(false)}
      class="px-3 py-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 rounded flex items-center gap-1.5"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
      {$t('auth.signIn')}
    </button>
  {/if}
</div>
