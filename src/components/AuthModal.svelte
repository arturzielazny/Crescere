<script>
  import {
    loading,
    error as authError,
    clearError,
    signInWithPassword,
    claimAccount,
    changePassword
  } from '../stores/authStore.js';
  import { t } from '../stores/i18n.js';

  /** @type {'signIn' | 'claimAccount' | 'changePassword'} */
  export let mode = 'signIn';
  export let onClose = () => {};
  export let onSuccess = () => {};

  const MIN_PASSWORD_LENGTH = 6;

  let email = '';
  let currentPassword = '';
  let password = '';
  let confirmPassword = '';
  let done = false;
  let localError = '';

  function reset() {
    email = '';
    currentPassword = '';
    password = '';
    confirmPassword = '';
    done = false;
    localError = '';
    clearError();
  }

  function handleClose() {
    reset();
    onClose();
  }

  /** Validate the new password + confirmation; sets localError and returns false on failure */
  function checkNewPassword() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      localError = $t('auth.setPassword.tooShort');
      return false;
    }
    if (password !== confirmPassword) {
      localError = $t('auth.setPassword.mismatch');
      return false;
    }
    return true;
  }

  $: needsEmail = mode !== 'changePassword';
  $: needsConfirm = mode !== 'signIn';
  $: canSubmit =
    (!needsEmail || email) &&
    password &&
    (!needsConfirm || confirmPassword) &&
    (mode !== 'changePassword' || currentPassword) &&
    !$loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    localError = '';
    clearError();
    if (needsConfirm && !checkNewPassword()) return;

    try {
      if (mode === 'signIn') {
        await signInWithPassword(email, password);
        onSuccess();
      } else if (mode === 'claimAccount') {
        await claimAccount(email, password);
        done = true;
      } else {
        await changePassword(currentPassword, password);
        done = true;
      }
    } catch (_err) {
      // error is set in auth store
    }
  }

  function submitOnEnter(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  $: title =
    mode === 'changePassword'
      ? $t('auth.changePassword.modalTitle')
      : mode === 'claimAccount'
        ? $t('auth.claimAccount.modalTitle')
        : $t('auth.signIn.modalTitle');

  $: description = mode === 'claimAccount' ? $t('auth.claimAccount.description') : '';

  $: submitLabel =
    mode === 'changePassword'
      ? $t('auth.changePassword.submit')
      : mode === 'claimAccount'
        ? $t('auth.claimAccount.submitPassword')
        : $t('auth.signInWithPassword');

  $: doneMessage =
    mode === 'changePassword' ? $t('auth.changePassword.updated') : $t('auth.claimAccount.saved');

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';
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

    {#if description && !done}
      <p class="text-sm text-gray-500 mb-4">{description}</p>
    {/if}

    {#if done}
      <p class="text-sm text-green-600 mb-4">{doneMessage}</p>
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
        {#if needsEmail}
          <input
            type="email"
            autocomplete="username"
            bind:value={email}
            placeholder={$t('auth.emailPlaceholder')}
            class={inputClass}
            on:keydown={submitOnEnter}
          />
        {/if}
        {#if mode === 'changePassword'}
          <input
            type="password"
            autocomplete="current-password"
            bind:value={currentPassword}
            placeholder={$t('auth.changePassword.currentPlaceholder')}
            class={inputClass}
            on:keydown={submitOnEnter}
          />
        {/if}
        <input
          type="password"
          autocomplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          bind:value={password}
          placeholder={mode === 'signIn'
            ? $t('auth.passwordPlaceholder')
            : $t('auth.setPassword.newPlaceholder')}
          class={inputClass}
          on:keydown={submitOnEnter}
        />
        {#if needsConfirm}
          <input
            type="password"
            autocomplete="new-password"
            bind:value={confirmPassword}
            placeholder={$t('auth.setPassword.confirmPlaceholder')}
            class={inputClass}
            on:keydown={submitOnEnter}
          />
        {/if}
        {#if localError}
          <p class="text-xs text-red-600">{localError}</p>
        {/if}
        {#if $authError}
          <p class="text-xs text-red-600">{$authError}</p>
        {/if}
        <button
          on:click={handleSubmit}
          disabled={!canSubmit}
          class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    {/if}
  </div>
</div>
