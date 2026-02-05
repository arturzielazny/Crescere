<script>
  import {
    loading,
    error as authError,
    clearError,
    signInWithEmail,
    signInWithPassword,
    signUpWithPassword,
    linkWithEmail,
    linkWithPassword,
    setPassword
  } from '../stores/authStore.js';
  import { t } from '../stores/i18n.js';

  /** @type {'signIn' | 'claimAccount' | 'setPassword'} */
  export let mode = 'signIn';
  export let onClose = () => {};
  export let onSuccess = () => {};

  let email = '';
  let password = '';
  let confirmPassword = '';
  let usePassword = false;
  let isSignUp = false;
  let emailSent = false;
  let passwordSet = false;
  let localError = '';

  function reset() {
    email = '';
    password = '';
    confirmPassword = '';
    usePassword = false;
    isSignUp = false;
    emailSent = false;
    passwordSet = false;
    localError = '';
    clearError();
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSetPassword() {
    localError = '';
    clearError();
    if (password.length < 6) {
      localError = $t('auth.setPassword.tooShort');
      return;
    }
    if (password !== confirmPassword) {
      localError = $t('auth.setPassword.mismatch');
      return;
    }
    try {
      await setPassword(password);
      passwordSet = true;
    } catch (_err) {
      // error is set in auth store
    }
  }

  async function handleEmailSubmit() {
    if (!email) return;
    localError = '';
    clearError();

    try {
      if (mode === 'claimAccount') {
        if (usePassword) {
          await linkWithPassword(email, password);
          emailSent = true;
        } else {
          await linkWithEmail(email);
          emailSent = true;
        }
      } else {
        // signIn mode
        if (usePassword) {
          if (isSignUp) {
            await signUpWithPassword(email, password);
            emailSent = true;
          } else {
            await signInWithPassword(email, password);
            onSuccess();
          }
        } else {
          await signInWithEmail(email);
          emailSent = true;
        }
      }
    } catch (_err) {
      // error is set in auth store
    }
  }

  $: title =
    mode === 'setPassword'
      ? $t('auth.setPassword.modalTitle')
      : mode === 'claimAccount'
        ? $t('auth.claimAccount.modalTitle')
        : $t('auth.signIn.modalTitle');

  $: description = mode === 'claimAccount' ? $t('auth.claimAccount.description') : '';
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  role="dialog"
  aria-modal="true"
  aria-labelledby="auth-modal-title"
  tabindex="-1"
  on:click={handleClose}
  on:keydown={(e) => e.key === 'Escape' && handleClose()}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" on:click|stopPropagation>
    <div class="flex justify-between items-center mb-4">
      <h2 id="auth-modal-title" class="text-lg font-semibold text-gray-800">
        {title}
      </h2>
      <button
        on:click={handleClose}
        class="p-1 text-gray-400 hover:text-gray-600 rounded"
        aria-label={$t('share.close')}
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    {#if description}
      <p class="text-sm text-gray-500 mb-4">{description}</p>
    {/if}

    {#if mode === 'setPassword'}
      <!-- Set password form -->
      {#if passwordSet}
        <p class="text-sm text-green-600 mb-4">{$t('auth.setPassword.updated')}</p>
        <div class="flex justify-end">
          <button
            on:click={handleClose}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            {$t('share.close')}
          </button>
        </div>
      {:else}
        <div class="space-y-3">
          <input
            type="password"
            bind:value={password}
            placeholder={$t('auth.setPassword.newPlaceholder')}
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:keydown={(e) => e.key === 'Enter' && confirmPassword && handleSetPassword()}
          />
          <input
            type="password"
            bind:value={confirmPassword}
            placeholder={$t('auth.setPassword.confirmPlaceholder')}
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:keydown={(e) => e.key === 'Enter' && handleSetPassword()}
          />
          {#if localError}
            <p class="text-xs text-red-600">{localError}</p>
          {/if}
          {#if $authError}
            <p class="text-xs text-red-600">{$authError}</p>
          {/if}
          <button
            on:click={handleSetPassword}
            disabled={!password || !confirmPassword || $loading}
            class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {$t('auth.setPassword.submit')}
          </button>
        </div>
      {/if}
    {:else}
      <!-- Sign in / Claim account form -->
      {#if emailSent}
        <p class="text-sm text-green-600 mb-4">
          {mode === 'claimAccount'
            ? $t('auth.emailSent.claim')
            : isSignUp
              ? $t('auth.signUpSent')
              : $t('auth.emailSent.signIn')}
        </p>
        <div class="flex justify-end">
          <button
            on:click={handleClose}
            class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            {$t('share.close')}
          </button>
        </div>
      {:else}
        <div class="space-y-3">
          <input
            type="email"
            bind:value={email}
            placeholder={$t('auth.emailPlaceholder')}
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            on:keydown={(e) => e.key === 'Enter' && !usePassword && handleEmailSubmit()}
          />
          {#if usePassword}
            <input
              type="password"
              bind:value={password}
              placeholder={$t('auth.passwordPlaceholder')}
              class="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              on:keydown={(e) => e.key === 'Enter' && handleEmailSubmit()}
            />
          {/if}
          {#if $authError}
            <p class="text-xs text-red-600">{$authError}</p>
          {/if}
          <button
            on:click={handleEmailSubmit}
            disabled={!email || (usePassword && !password) || $loading}
            class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if usePassword}
              {isSignUp ? $t('auth.signUp') : $t('auth.signInWithPassword')}
            {:else}
              {$t('auth.sendLink')}
            {/if}
          </button>
          <div class="flex items-center justify-between">
            <button
              on:click={() => {
                usePassword = !usePassword;
                password = '';
                isSignUp = false;
                clearError();
              }}
              class="text-xs text-blue-500 hover:text-blue-700"
            >
              {usePassword ? $t('auth.switchToMagicLink') : $t('auth.switchToPassword')}
            </button>
            {#if usePassword && mode !== 'claimAccount'}
              <button
                on:click={() => {
                  isSignUp = !isSignUp;
                  clearError();
                }}
                class="text-xs text-gray-500 hover:text-gray-700"
              >
                {isSignUp ? $t('auth.switchToSignIn') : $t('auth.switchToSignUp')}
              </button>
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
