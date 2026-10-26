<script>
  import { onMount, onDestroy, tick, flushSync } from 'svelte';
  import ChildList from './components/ChildList.svelte';
  import MeasurementTable from './components/MeasurementTable.svelte';
  import ZScoreTable from './components/ZScoreTable.svelte';
  import ChartPanel from './components/ChartPanel.svelte';
  import SummaryCard from './components/SummaryCard.svelte';
  import ChildProfileSheet from './components/ChildProfileSheet.svelte';
  import MeasurementSheet from './components/MeasurementSheet.svelte';
  import ShareModal from './components/ShareModal.svelte';
  import Toast from './components/Toast.svelte';
  import UserMenu from './components/UserMenu.svelte';
  import AuthModal from './components/AuthModal.svelte';
  import OverflowMenu from './components/OverflowMenu.svelte';
  import LanguageSwitcher from './components/LanguageSwitcher.svelte';
  import OnboardingBanner from './components/OnboardingBanner.svelte';
  import {
    childStore,
    activeChild,
    resetStore,
    sharedChildIds,
    dataLoading,
    dataError,
    syncError,
    enableSync,
    disableSync,
    acceptLiveShare,
    exampleChildId,
    importChildren,
    addChild
  } from './stores/childStore.js';
  import {
    initAuth,
    isAuthenticated,
    isAnonymous,
    loading as authLoading,
    signInAnonymously,
    signOut
  } from './stores/authStore.js';
  import { exportToCsv, importFromCsv } from './lib/csv.js';
  import { parseLiveShareUrl, clearShareHash } from './lib/share.js';
  import { t, language } from './stores/i18n.js';
  import { toast, showToast, dismissToast } from './stores/toastStore.js';
  import { calculateAgeInDays, formatAge } from './lib/zscore.js';
  import { formatDate } from './lib/utils.js';
  import { dialog } from './lib/dialog.js';

  let showShareModal = false;
  let showProfileSheet = false;
  /** null = closed; { measurement: null } adds, { measurement } edits */
  let measurementSheet = null;
  let explainOpen = false;
  /** True while printing: the chart panel renders every chart for the print layout */
  let printing = false;
  /** @type {null | 'signIn' | 'claimAccount' | 'changePassword'} */
  let authModalMode = null;

  async function checkForLiveShare() {
    const token = parseLiveShareUrl();
    if (!token) return;

    clearShareHash();

    if (!$isAuthenticated) {
      showToast({ message: $t('share.live.requiresAuth'), type: 'error' });
      return;
    }

    try {
      const result = await acceptLiveShare(token);
      if (result.alreadyAccepted) {
        showToast({ message: $t('share.live.alreadyAdded'), type: 'info' });
      } else {
        showToast({ message: $t('share.live.accepted'), type: 'success' });
      }
    } catch (_err) {
      console.error('Failed to accept live share:', _err);
      showToast({ message: $t('share.live.error'), type: 'error' });
    }
  }

  async function loadAuthenticatedData() {
    await enableSync($t('children.example'));
  }

  // Failed saves are rolled back by the store; tell the user and offer to repeat the change
  $: if ($syncError) {
    const { retry } = $syncError;
    showToast({
      message: $t('sync.failed'),
      type: 'error',
      duration: 10000,
      action: retry ? { label: $t('sync.retry'), onClick: retry } : null
    });
    syncError.set(null);
  }

  async function initializeApp() {
    await initAuth();

    if (!$isAuthenticated && !$authLoading) {
      // First visit — auto sign in anonymously so user lands right in the app
      try {
        await signInAnonymously();
      } catch (err) {
        // Show the error instead of an endless spinner; the Sign in button still works
        dataError.set(err.message);
        dataLoading.set(false);
        return;
      }
    }

    // Authenticated (existing session or just auto-signed-in) — load data
    await loadAuthenticatedData();

    // Check for live share URL
    checkForLiveShare();
  }

  async function handleSignedIn() {
    await loadAuthenticatedData();
    checkForLiveShare();
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out failed:', err);
      return;
    }
    resetStore();
    disableSync();
    try {
      await signInAnonymously();
      await loadAuthenticatedData();
    } catch (_err) {
      console.error('Auto sign-in after logout failed:', _err);
    }
  }

  onMount(() => {
    initializeApp();

    // Listen for hash changes (when user opens share link while app is loaded)
    window.addEventListener('hashchange', checkForLiveShare);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
  });

  onDestroy(() => {
    window.removeEventListener('hashchange', checkForLiveShare);
    window.removeEventListener('beforeprint', handleBeforePrint);
    window.removeEventListener('afterprint', handleAfterPrint);
  });

  function handleExport() {
    const exId = $exampleChildId;
    const sharedIds = $sharedChildIds;
    const children = $childStore.children.filter((c) => c.id !== exId && !sharedIds.has(c.id));
    const csv = exportToCsv(children);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growth-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedData = importFromCsv(e.target.result);
        await importChildren(importedData.children);
        showToast({ message: $t('app.import.success'), type: 'success' });
      } catch (_err) {
        showToast({ message: $t('app.import.error'), type: 'error' });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  $: canShare =
    $isAuthenticated &&
    !$isAnonymous &&
    $activeChild &&
    $activeChild?.id !== $exampleChildId &&
    !$sharedChildIds.has($activeChild?.id);

  $: shareDisabledReason = (() => {
    if (!$isAuthenticated) return $t('app.share.disabled.notSignedIn');
    if ($isAnonymous) return $t('app.share.disabled.guest');
    if (!$activeChild) return $t('app.share.disabled.noChild');
    if ($activeChild?.id === $exampleChildId) return $t('app.share.disabled.example');
    if ($sharedChildIds.has($activeChild?.id)) return $t('app.share.disabled.alreadyShared');
    return '';
  })();

  let shareInfoMessage = '';

  function handleShare() {
    if (canShare) {
      showShareModal = true;
    } else if (shareDisabledReason) {
      shareInfoMessage = shareDisabledReason;
    }
  }

  $: isLoading = $authLoading || $dataLoading;
  $: footerStorageText =
    $isAuthenticated && !$isAnonymous ? $t('app.footer.storage.cloud') : $t('app.footer.storage');

  $: printAge = (() => {
    const child = $activeChild;
    if (!child?.profile?.birthDate) return '';
    const today = new Date().toISOString().slice(0, 10);
    const days = calculateAgeInDays(child.profile.birthDate, today);
    if (days < 0) return '';
    return formatAge(days, {
      invalid: $t('age.invalid'),
      month: $t('age.month'),
      day: $t('age.day')
    });
  })();

  $: printSex = (() => {
    const sex = $activeChild?.profile?.sex;
    if (sex === 1) return $t('profile.sex.male');
    if (sex === 2) return $t('profile.sex.female');
    return '';
  })();

  // Browser print (Ctrl+P): render the print charts synchronously before the page is captured
  function handleBeforePrint() {
    if (printing) return;
    printing = true;
    flushSync();
  }

  function handleAfterPrint() {
    printing = false;
  }

  // Print button: render the print charts and let them lay out before opening the dialog
  async function handlePrint() {
    printing = true;
    await tick();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.print();
  }

  async function handleExplain() {
    explainOpen = true;
    await tick();
    document.getElementById('explain')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleAddChild() {
    addChild();
    showProfileSheet = true;
  }
</script>

<div class="min-h-screen bg-gray-100">
  <header class="bg-white shadow-sm print-hidden">
    <div class="px-4 py-3 flex justify-between items-center gap-2">
      <h1 class="text-xl font-bold text-gray-800 whitespace-nowrap">
        Crescere<span class="hidden md:inline">{` - ${$t('app.tagline')}`}</span>
      </h1>
      <div class="flex gap-2 items-center">
        <div class="hidden sm:block">
          <LanguageSwitcher />
        </div>
        <OverflowMenu onExport={handleExport} onImport={handleImport} onPrint={handlePrint} />
        <div class="border-l border-gray-200 pl-2 ml-1">
          <UserMenu onSignOut={handleSignOut} onOpenAuth={(mode) => (authModalMode = mode)} />
        </div>
      </div>
    </div>
  </header>

  <main class="px-4 py-6">
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div
            class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent"
          ></div>
          <p class="mt-3 text-gray-600">
            {$t('auth.loading')}
          </p>
        </div>
      </div>
    {:else}
      {#if $dataError}
        <div
          class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 print-hidden flex flex-wrap items-center gap-3"
          role="alert"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">{$t('data.loadFailed')}</p>
            <p class="text-xs text-red-700 mt-0.5 break-words">{$dataError}</p>
          </div>
          <button
            type="button"
            on:click={() => window.location.reload()}
            class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded"
          >
            {$t('data.reload')}
          </button>
          <button
            type="button"
            on:click={() => dataError.set(null)}
            class="p-1.5 text-red-500 hover:text-red-700 rounded"
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
      {/if}

      {#if $isAnonymous}
        <div class="print-hidden">
          <OnboardingBanner
            hasRealChildren={!$exampleChildId}
            onSaveAccount={() => (authModalMode = 'claimAccount')}
          />
        </div>
      {/if}

      <div class="print-hidden">
        <ChildList onEditProfile={() => (showProfileSheet = true)} />
      </div>

      <!-- Print-only header with child info -->
      {#if $activeChild}
        <div class="print-only hidden mb-6">
          <h1 class="text-2xl font-bold text-gray-900 mb-2">{$t('print.title')}</h1>
          <div class="text-sm text-gray-700 space-y-1">
            <p class="text-lg font-semibold">
              {$activeChild?.profile?.name || $t('children.unnamed')}
            </p>
            {#if $activeChild?.profile?.birthDate}
              <p>
                {$t('print.born')}: {formatDate($activeChild.profile.birthDate, $language)}
                {#if printSex}&middot; {$t('print.sex')}: {printSex}{/if}
                {#if printAge}&middot; {$t('profile.age.current')} {printAge}{/if}
              </p>
            {/if}
            <p class="text-xs text-gray-500">
              {$t('print.generated')}: {formatDate(
                new Date().toISOString().slice(0, 10),
                $language
              )}
            </p>
          </div>
          <hr class="mt-3 border-gray-300" />
        </div>
      {/if}

      <SummaryCard
        onAddMeasurement={() => (measurementSheet = { measurement: null })}
        onEditProfile={() => (showProfileSheet = true)}
        onShare={handleShare}
        onExplain={handleExplain}
        onAddChild={handleAddChild}
      />

      <div class="lg:flex lg:gap-6 lg:items-start print-full-width">
        <!-- Left panel: measurement entry (1/3) -->
        <aside
          class="hidden lg:block lg:w-1/3 lg:flex-shrink-0 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto print-hidden"
        >
          <MeasurementTable compact />
        </aside>

        <!-- Right panel: charts + z-scores (2/3) -->
        <div class="flex-1 min-w-0">
          <!-- Print order: table first, then charts -->
          <div class="print-only hidden mb-4 print-table">
            <ZScoreTable />
          </div>

          <ChartPanel {printing} />

          <div class="print-hidden mt-6">
            <ZScoreTable onEdit={(measurement) => (measurementSheet = { measurement })} />
          </div>

          <details
            id="explain"
            bind:open={explainOpen}
            class="group bg-white rounded-lg shadow mt-6 print-hidden"
          >
            <summary
              class="flex items-center justify-between gap-2 cursor-pointer select-none px-6 py-4 text-lg font-semibold text-gray-800 list-none [&::-webkit-details-marker]:hidden"
            >
              {$t('explain.title')}
              <svg
                class="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div class="px-6 pb-6">
              <p class="text-sm text-gray-600 mb-3">
                {$t('explain.summary')}
              </p>
              <p class="text-sm text-gray-600 mb-4">
                {$t('explain.meaning')}
              </p>
              <h3 class="text-sm font-semibold text-gray-700 mb-3">{$t('explain.shortcuts')}</h3>
              <dl class="text-sm text-gray-600 space-y-3">
                <div>
                  <dt class="font-medium text-gray-700">{$t('explain.waz.title')}</dt>
                  <dd class="ml-0 mt-0.5">{$t('explain.waz.desc')}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700">{$t('explain.lhaz.title')}</dt>
                  <dd class="ml-0 mt-0.5">{$t('explain.lhaz.desc')}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700">{$t('explain.headcz.title')}</dt>
                  <dd class="ml-0 mt-0.5">{$t('explain.headcz.desc')}</dd>
                </div>
                <div>
                  <dt class="font-medium text-gray-700">{$t('explain.wflz.title')}</dt>
                  <dd class="ml-0 mt-0.5">{$t('explain.wflz.desc')}</dd>
                </div>
              </dl>
            </div>
          </details>
        </div>
      </div>
    {/if}
  </main>

  <footer class="text-center py-4 text-sm text-gray-500 print-hidden">
    <p>
      {$t('app.footer.source')}
      <a
        href="https://www.who.int/tools/child-growth-standards"
        class="text-blue-600 hover:underline"
        target="_blank"
      >
        {$t('app.footer.source.link')}
      </a>
    </p>
    <p class="mt-1">{footerStorageText}</p>
    <p class="mt-1">{$t('app.footer.disclaimer')}</p>
  </footer>
</div>

{#if authModalMode}
  <AuthModal
    mode={authModalMode}
    onClose={() => (authModalMode = null)}
    onSuccess={authModalMode === 'signIn'
      ? () => {
          authModalMode = null;
          handleSignedIn();
        }
      : () => (authModalMode = null)}
  />
{/if}

{#if measurementSheet}
  <MeasurementSheet
    measurement={measurementSheet.measurement}
    onClose={() => (measurementSheet = null)}
  />
{/if}

{#if showProfileSheet}
  <ChildProfileSheet onClose={() => (showProfileSheet = false)} />
{/if}

{#if showShareModal}
  <ShareModal
    childId={$activeChild?.id || ''}
    childName={$activeChild?.profile?.name || ''}
    onClose={() => (showShareModal = false)}
  />
{/if}

{#if shareInfoMessage}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    on:click={() => (shareInfoMessage = '')}
    use:dialog={{ onClose: () => (shareInfoMessage = '') }}
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6 text-center"
      on:click|stopPropagation
    >
      <p class="text-sm text-gray-700 mb-4">{shareInfoMessage}</p>
      <button
        on:click={() => (shareInfoMessage = '')}
        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
      >
        {$t('share.close')}
      </button>
    </div>
  </div>
{/if}

{#if $toast}
  {#key $toast.id}
    <Toast
      message={$toast.message}
      type={$toast.type}
      duration={$toast.duration}
      action={$toast.action}
      onClose={dismissToast}
    />
  {/key}
{/if}
