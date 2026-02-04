<script>
  import { t } from '../stores/i18n.js';
  import { signInWithEmail } from '../stores/authStore.js';

  export let onContinueAsGuest;

  let showEmailInput = false;
  let email = '';
  let emailSent = false;
  let sending = false;

  async function handleSendLink() {
    if (!email) return;
    sending = true;
    try {
      await signInWithEmail(email);
      emailSent = true;
    } catch (err) {
      console.error('Sign-in email failed:', err);
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
            on:keydown={(e) => e.key === 'Enter' && handleSendLink()}
          />
          <div class="flex gap-2">
            <button
              on:click={handleSendLink}
              disabled={!email || sending}
              class="flex-1 px-4 py-2 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {$t('auth.sendLink')}
            </button>
            <button
              on:click={() => {
                showEmailInput = false;
                email = '';
              }}
              class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
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
