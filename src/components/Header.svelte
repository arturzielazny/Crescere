<script>
  import {
    user,
    isAuthenticated,
    isAnonymous,
    loading,
    signInWithEmail,
    signInWithPassword,
    signUpWithPassword,
    linkWithEmail,
    linkWithPassword,
    error as authError,
    clearError
  } from '../stores/authStore.js';
  import { t } from '../stores/i18n.js';

  export let onSignOut = () => {};

  let showEmailInput = false;
  let email = '';
  let password = '';
  let emailSent = false;
  let isLinking = false;
  let usePassword = false;
  let isSignUp = false;

  function openEmailInput(linking = false) {
    isLinking = linking;
    showEmailInput = true;
    email = '';
    password = '';
    emailSent = false;
    usePassword = false;
    isSignUp = false;
    clearError();
  }

  function closeEmailInput() {
    showEmailInput = false;
    email = '';
    password = '';
    emailSent = false;
    isLinking = false;
    usePassword = false;
    isSignUp = false;
    clearError();
  }

  async function handleEmailSubmit() {
    if (!email) return;
    clearError();

    try {
      if (usePassword) {
        if (isLinking) {
          await linkWithPassword(email, password);
          emailSent = true;
        } else if (isSignUp) {
          await signUpWithPassword(email, password);
          emailSent = true;
        } else {
          await signInWithPassword(email, password);
        }
      } else {
        if (isLinking) {
          await linkWithEmail(email);
        } else {
          await signInWithEmail(email);
        }
        emailSent = true;
      }
    } catch (_err) {
      // error is set in auth store
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
    <div class="flex items-center gap-2 flex-wrap">
      {#if emailSent}
        <span class="text-sm text-green-600">
          {isLinking
            ? $t('auth.emailSent.claim')
            : isSignUp
              ? $t('auth.signUpSent')
              : $t('auth.emailSent.signIn')}
        </span>
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
          on:keydown={(e) => e.key === 'Enter' && !usePassword && handleEmailSubmit()}
        />
        {#if usePassword}
          <input
            type="password"
            bind:value={password}
            placeholder={$t('auth.passwordPlaceholder')}
            class="px-2 py-1 text-sm border border-gray-200 rounded w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
            on:keydown={(e) => e.key === 'Enter' && handleEmailSubmit()}
          />
        {/if}
        <button
          on:click={handleEmailSubmit}
          disabled={!email || (usePassword && !password)}
          class="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if usePassword}
            {isSignUp ? $t('auth.signUp') : $t('auth.signInWithPassword')}
          {:else}
            {$t('auth.sendLink')}
          {/if}
        </button>
        <button
          on:click={() => {
            usePassword = !usePassword;
            password = '';
            isSignUp = false;
            clearError();
          }}
          class="px-2 py-1 text-xs text-blue-500 hover:text-blue-700"
          title={usePassword ? $t('auth.switchToMagicLink') : $t('auth.switchToPassword')}
        >
          {usePassword ? $t('auth.switchToMagicLink') : $t('auth.switchToPassword')}
        </button>
        {#if usePassword && !isLinking}
          <button
            on:click={() => {
              isSignUp = !isSignUp;
              clearError();
            }}
            class="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {isSignUp ? $t('auth.switchToSignIn') : $t('auth.switchToSignUp')}
          </button>
        {/if}
        <button
          on:click={closeEmailInput}
          class="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        {#if $authError}
          <span class="text-xs text-red-600 w-full">{$authError}</span>
        {/if}
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
