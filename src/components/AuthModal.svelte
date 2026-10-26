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
  import { dialog } from '../lib/dialog.js';

  /** @type {'signIn' | 'claimAccount' | 'changePassword'} */
  export let mode = 'signIn';
  export let onClose = () => {};
  export let onSuccess = () => {};
  /** Switch the dialog to another mode (the "Already have an account?" link) */
  export let onSwitchMode = null;
  /** Why the dialog was opened, shown above the form (e.g. sharing needs a saved account) */
  export let notice = '';
  /** A guest with their own children: signing in moves them into that account */
  export let guestHasData = false;

  const MIN_PASSWORD_LENGTH = 6;

  let email = '';
  let currentPassword = '';
  let password = '';
  let confirmPassword = '';
  let done = false;
  let localError = '';
  let showPassword = false;

  function reset() {
    email = '';
    currentPassword = '';
    password = '';
    confirmPassword = '';
    done = false;
    localError = '';
    showPassword = false;
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
        const { movedChildren } = await signInWithPassword(email, password);
        onSuccess({ movedChildren });
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

  $: passwordType = showPassword ? 'text' : 'password';

  const labelClass = 'block text-xs font-medium text-gray-600 mb-1';
  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';
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
  use:dialog={{ onClose: handleClose }}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" on:click|stopPropagation>
    <div class="flex justify-between items-center mb-4">
      <h2 id="auth-modal-title" class="text-lg font-semibold text-gray-800">
        {title}
      </h2>
      <button
        type="button"
        on:click={handleClose}
        class="p-2 -m-1 text-gray-400 hover:text-gray-600 rounded"
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

    {#if notice && !done}
      <p class="text-sm text-blue-800 bg-blue-50 rounded px-3 py-2 mb-3">{notice}</p>
    {/if}
    {#if description && !done}
      <p class="text-sm text-gray-500 mb-4">{description}</p>
    {/if}
    {#if mode === 'signIn' && guestHasData}
      <p class="text-sm text-blue-800 bg-blue-50 rounded px-3 py-2 mb-4" role="note">
        {$t('auth.signIn.guestDataMoves')}
      </p>
    {/if}

    {#if done}
      <p class="text-sm text-green-700 mb-4">{doneMessage}</p>
      <div class="flex justify-end">
        <button
          type="button"
          on:click={handleClose}
          data-autofocus
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
        >
          {$t('share.close')}
        </button>
      </div>
    {:else}
      <form class="space-y-3" on:submit|preventDefault={handleSubmit}>
        {#if needsEmail}
          <div>
            <label for="auth-email" class={labelClass}>{$t('auth.email')}</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autocomplete="username"
              bind:value={email}
              placeholder={$t('auth.emailPlaceholder')}
              class={inputClass}
            />
          </div>
        {/if}
        {#if mode === 'changePassword'}
          <div>
            <label for="auth-current" class={labelClass}
              >{$t('auth.changePassword.currentPlaceholder')}</label
            >
            <input
              id="auth-current"
              name="current-password"
              type={passwordType}
              autocomplete="current-password"
              bind:value={currentPassword}
              class={inputClass}
            />
          </div>
        {/if}
        <div>
          <label for="auth-password" class={labelClass}>
            {mode === 'signIn' ? $t('auth.password') : $t('auth.setPassword.newPlaceholder')}
          </label>
          <input
            id="auth-password"
            name="password"
            type={passwordType}
            autocomplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            bind:value={password}
            class={inputClass}
          />
        </div>
        {#if needsConfirm}
          <div>
            <label for="auth-confirm" class={labelClass}
              >{$t('auth.setPassword.confirmPlaceholder')}</label
            >
            <input
              id="auth-confirm"
              name="confirm-password"
              type={passwordType}
              autocomplete="new-password"
              bind:value={confirmPassword}
              class={inputClass}
            />
          </div>
        {/if}
        <label class="flex items-center gap-2 text-xs text-gray-600 select-none">
          <input type="checkbox" bind:checked={showPassword} class="rounded" />
          {$t('auth.showPassword')}
        </label>
        {#if localError}
          <p class="text-xs text-red-600" role="alert">{localError}</p>
        {/if}
        {#if $authError}
          <p class="text-xs text-red-600" role="alert">{$authError}</p>
        {/if}
        <button
          type="submit"
          disabled={!canSubmit}
          class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
        {#if mode === 'signIn'}
          <p class="text-xs text-gray-500">{$t('auth.forgotPassword')}</p>
        {:else if mode === 'claimAccount' && onSwitchMode}
          <p class="text-xs text-gray-600 text-center">
            {$t('auth.haveAccount')}
            <button
              type="button"
              on:click={() => onSwitchMode('signIn')}
              class="font-medium text-blue-600 hover:underline"
            >
              {$t('auth.signIn')}
            </button>
          </p>
        {/if}
      </form>
    {/if}
  </div>
</div>
