<script>
  import { onMount, onDestroy } from 'svelte';
  import ChildList from './components/ChildList.svelte';
  import MeasurementTable from './components/MeasurementTable.svelte';
  import ZScoreTable from './components/ZScoreTable.svelte';
  import ChartGrid from './components/ChartGrid.svelte';
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
    enableSync,
    disableSync,
    acceptLiveShare,
    exampleChildId,
    importChildren
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
  import { t } from './stores/i18n.js';
  import { calculateAgeInDays, formatAge } from './lib/zscore.js';

  let showShareModal = false;
  let toast = null;
  /** @type {null | 'signIn' | 'claimAccount' | 'setPassword'} */
  let authModalMode = null;

  async function checkForLiveShare() {
    const token = parseLiveShareUrl();
    if (!token) return;

    clearShareHash();

    if (!$isAuthenticated) {
      toast = { message: $t('share.live.requiresAuth'), type: 'error' };
      return;
    }

    try {
      const result = await acceptLiveShare(token);
      if (result.alreadyAccepted) {
        toast = { message: $t('share.live.alreadyAdded'), type: 'info' };
      } else {
        toast = { message: $t('share.live.accepted'), type: 'success' };
      }
    } catch (_err) {
      console.error('Failed to accept live share:', _err);
      toast = { message: $t('share.live.error'), type: 'error' };
    }
  }

  async function loadAuthenticatedData() {
    await enableSync($t('children.example'));
  }

  async function initializeApp() {
    await initAuth();

    if (!$isAuthenticated && !$authLoading) {
      // First visit — auto sign in anonymously so user lands right in the app
      try {
        await signInAnonymously();
      } catch (_err) {
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
  });

  onDestroy(() => {
    window.removeEventListener('hashchange', checkForLiveShare);
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
        toast = { message: $t('app.import.success'), type: 'success' };
      } catch (_err) {
        toast = { message: $t('app.import.error'), type: 'error' };
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

  function handlePrint() {
    window.print();
  }
</script>

<div class="min-h-screen bg-gray-100">
  <header class="bg-white shadow-sm print-hidden">
    <div class="px-4 py-3 flex justify-between items-center gap-2">
      <h1 class="text-xl font-bold text-gray-800 whitespace-nowrap">
        {$t('app.title')}
      </h1>
      <div class="flex gap-2 items-center">
        <LanguageSwitcher />
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
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 print-hidden">
          {$t('auth.error')}: {$dataError}
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
        <ChildList onShare={handleShare} onPrint={handlePrint} />
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
                {$t('print.born')}: {$activeChild.profile.birthDate}
                {#if printSex}&middot; {$t('print.sex')}: {printSex}{/if}
                {#if printAge}&middot; {$t('profile.age.current')} {printAge}{/if}
              </p>
            {/if}
            <p class="text-xs text-gray-500">
              {$t('print.generated')}: {new Date().toLocaleDateString()}
            </p>
          </div>
          <hr class="mt-3 border-gray-300" />
        </div>
      {/if}

      <div class="lg:flex lg:gap-6 lg:items-start print-full-width">
        <!-- Left panel: measurement entry (1/3) -->
        <aside
          class="lg:w-1/3 lg:flex-shrink-0 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto mb-4 lg:mb-0 print-hidden"
        >
          <MeasurementTable compact />
        </aside>

        <!-- Right panel: charts + z-scores (2/3) -->
        <div class="flex-1 min-w-0">
          <!-- Print order: table first, then charts -->
          <div class="print-only hidden mb-4 print-table">
            <ZScoreTable />
          </div>

          <ChartGrid />

          <div class="print-hidden">
            <ZScoreTable />
          </div>

          <section class="bg-white rounded-lg shadow p-6 mt-6 print-hidden">
            <h2 class="text-lg font-semibold text-gray-800 mb-3">{$t('explain.title')}</h2>
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
          </section>
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
    on:click={() => (shareInfoMessage = '')}
    on:keydown={(e) => e.key === 'Escape' && (shareInfoMessage = '')}
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

{#if toast}
  <Toast message={toast.message} type={toast.type} onClose={() => (toast = null)} />
{/if}
