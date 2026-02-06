<script>
  import { t } from '../stores/i18n.js';
  import {
    signInWithEmail,
    signInWithPassword,
    error as authError,
    clearError
  } from '../stores/authStore.js';

  export let onContinueAsGuest;
  export let onSignedIn = () => {};

  let showEmailInput = false;
  let email = '';
  let password = '';
  let emailSent = false;
  let sending = false;
  let usePassword = false;

  function resetForm() {
    showEmailInput = false;
    email = '';
    password = '';
    emailSent = false;
    usePassword = false;
    clearError();
  }

  async function handleSendLink() {
    if (!email) return;
    sending = true;
    clearError();
    try {
      await signInWithEmail(email);
      emailSent = true;
    } catch (_err) {
      // error is set in auth store
    } finally {
      sending = false;
    }
  }

  async function handlePasswordSubmit() {
    if (!email || !password) return;
    sending = true;
    clearError();
    try {
      await signInWithPassword(email, password);
      onSignedIn();
    } catch (_err) {
      // error is set in auth store
    } finally {
      sending = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-100 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
    <h1 class="text-2xl font-bold text-gray-800 mb-2">
      {$t('auth.welcome.title')}
    </h1>
    <p class="text-sm text-gray-600 mb-6">
      {$t('auth.welcome.description')}
    </p>

    <div class="space-y-3">
      <button
        on:click={onContinueAsGuest}
        class="w-full px-4 py-2.5 text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200"
      >
        {$t('auth.welcome.continueAsGuest')}
      </button>

      {#if emailSent}
        <div class="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
          {$t('auth.emailSent.signIn')}
        </div>
      {:else if showEmailInput}
        <div class="space-y-2">
          <input
            type="email"
            bind:value={email}
            placeholder={$t('auth.emailPlaceholder')}
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            on:keydown={(e) =>
              e.key === 'Enter' && (usePassword ? handlePasswordSubmit() : handleSendLink())}
          />

          {#if usePassword}
            <input
              type="password"
              bind:value={password}
              placeholder={$t('auth.passwordPlaceholder')}
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              on:keydown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
          {/if}

          {#if $authError}
            <p class="text-sm text-red-600">{$authError}</p>
          {/if}

          <div class="flex gap-2">
            {#if usePassword}
              <button
                on:click={handlePasswordSubmit}
                disabled={!email || !password || sending}
                class="flex-1 px-4 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {$t('auth.signInWithPassword')}
              </button>
            {:else}
              <button
                on:click={handleSendLink}
                disabled={!email || sending}
                class="flex-1 px-4 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {$t('auth.sendLink')}
              </button>
            {/if}
            <button
              on:click={resetForm}
              class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <button
            on:click={() => {
              usePassword = !usePassword;
              password = '';
              clearError();
            }}
            class="w-full text-xs text-blue-500 hover:text-blue-700"
          >
            {usePassword ? $t('auth.switchToMagicLink') : $t('auth.switchToPassword')}
          </button>
        </div>
      {:else}
        <button
          on:click={() => (showEmailInput = true)}
          class="w-full px-4 py-2.5 text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200 flex items-center justify-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {$t('auth.welcome.signInWithEmail')}
        </button>
      {/if}
    </div>

    <p class="text-xs text-gray-400 mt-4">
      {$t('auth.welcome.guestNote')}
    </p>
  </div>
</div>
