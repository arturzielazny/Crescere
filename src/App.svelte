<script>
  import { onMount, onDestroy } from 'svelte';
  import ChildList from './components/ChildList.svelte';
  import MeasurementTable from './components/MeasurementTable.svelte';
  import ZScoreTable from './components/ZScoreTable.svelte';
  import ChartGrid from './components/ChartGrid.svelte';
  import ShareModal from './components/ShareModal.svelte';
  import Toast from './components/Toast.svelte';
  import Header from './components/Header.svelte';
  import WelcomeScreen from './components/WelcomeScreen.svelte';
  import {
    childStore,
    activeChild,
    resetStore,
    sharedChildIds,
    dataLoading,
    dataError,
    enableSync,
    disableSync,
    acceptLiveShare
  } from './stores/childStore.js';
  import {
    initAuth,
    isAuthenticated,
    isAnonymous,
    loading as authLoading,
    signInAnonymously,
    signOut
  } from './stores/authStore.js';
  import { migrateData } from './lib/storage.js';
  import { migrateToSupabase, hasLocalData } from './lib/migrate.js';
  import { parseLiveShareUrl, clearShareHash } from './lib/share.js';
  import { availableLanguages, language, setLanguage, t } from './stores/i18n.js';
  import { calculateAgeInDays, formatAge } from './lib/zscore.js';

  let showWelcome = false;
  let showShareModal = false;
  let toast = null;
  let migrating = false;
  let menuOpen = false;

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
    if (hasLocalData()) {
      migrating = true;
      const result = await migrateToSupabase();
      migrating = false;

      if (result.migrated) {
        toast = {
          message: $t('auth.migrated'),
          type: 'success'
        };
      }
    }

    // Load data from Supabase (injects local-only example child if no data exists)
    await enableSync($t('children.example'));
  }

  async function initializeApp() {
    await initAuth();

    // If no session, show welcome screen instead of auto-signing in
    if (!$isAuthenticated && !$authLoading) {
      showWelcome = true;
      return;
    }

    // Already authenticated - load data
    await loadAuthenticatedData();

    // Check for live share URL
    checkForLiveShare();
  }

  async function handleContinueAsGuest() {
    showWelcome = false;
    try {
      await signInAnonymously();
    } catch (err) {
      console.error('Anonymous sign-in failed:', err);
      return;
    }
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
    showWelcome = true;
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
    const data = { ...$childStore, version: 2 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growth-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    if (confirm($t('app.clear.confirm'))) {
      resetStore();
    }
  }

  function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rawData = JSON.parse(e.target.result);
        const importedData = migrateData(rawData);

        // Merge imported children with existing ones
        const existingIds = new Set($childStore.children.map((c) => c.id));
        const newChildren = importedData.children.map((child) => {
          // Generate new ID if it conflicts with existing
          if (existingIds.has(child.id)) {
            return { ...child, id: crypto.randomUUID() };
          }
          return child;
        });

        childStore.update((state) => ({
          ...state,
          children: [...state.children, ...newChildren],
          activeChildId: state.activeChildId || newChildren[0]?.id || null
        }));

        toast = { message: $t('app.import.success'), type: 'success' };
      } catch (_err) {
        toast = { message: $t('app.import.error'), type: 'error' };
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  $: canShare =
    $isAuthenticated && !$isAnonymous && $activeChild && !$sharedChildIds.has($activeChild?.id);

  function handleShare() {
    if (canShare) {
      showShareModal = true;
    }
  }

  $: isLoading = $authLoading || $dataLoading || migrating;
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

{#if showWelcome}
  <WelcomeScreen onContinueAsGuest={handleContinueAsGuest} />
{:else}
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow-sm print-hidden">
      <div class="px-4 py-3 flex justify-between items-center gap-2">
        <h1 class="text-xl font-bold text-gray-800 whitespace-nowrap">
          {$t('app.title')}
        </h1>
        <div class="flex gap-2 items-center">
          <!-- Language & Share: always visible -->
          <select
            id="language-select"
            value={$language}
            on:change={(event) => setLanguage(event.target.value)}
            class="px-2 py-1.5 text-sm border border-gray-200 rounded bg-white hidden sm:block"
            aria-label={$t('app.language.label')}
          >
            {#each availableLanguages as lang (lang)}
              <option value={lang}>
                {$t(`app.language.${lang}`)}
              </option>
            {/each}
          </select>
          <button
            on:click={handleShare}
            disabled={!canShare}
            class="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {$t('app.share')}
          </button>
          <button
            on:click={handlePrint}
            disabled={!$activeChild}
            class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hidden sm:block"
          >
            {$t('app.print')}
          </button>

          <!-- Desktop: inline buttons -->
          <button
            on:click={handleExport}
            class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded hidden sm:block"
          >
            {$t('app.export')}
          </button>
          <label
            class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded cursor-pointer hidden sm:block"
          >
            {$t('app.import')}
            <input type="file" accept=".json" on:change={handleImport} class="hidden" />
          </label>
          <button
            on:click={handleClear}
            class="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded hidden sm:block"
          >
            {$t('app.clear')}
          </button>

          <!-- Mobile: kebab menu -->
          <div class="relative sm:hidden">
            <button
              on:click={() => (menuOpen = !menuOpen)}
              class="p-1.5 rounded hover:bg-gray-100"
              aria-label={$t('app.menu')}
            >
              <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
                />
              </svg>
            </button>
            {#if menuOpen}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <div class="fixed inset-0 z-40" on:click={() => (menuOpen = false)}></div>
              <div
                class="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
              >
                <div class="px-3 py-2 border-b border-gray-100">
                  <select
                    value={$language}
                    on:change={(event) => {
                      setLanguage(event.target.value);
                      menuOpen = false;
                    }}
                    class="w-full px-2 py-1 text-sm border border-gray-200 rounded bg-white"
                    aria-label={$t('app.language.label')}
                  >
                    {#each availableLanguages as lang (lang)}
                      <option value={lang}>
                        {$t(`app.language.${lang}`)}
                      </option>
                    {/each}
                  </select>
                </div>
                <button
                  on:click={() => {
                    handlePrint();
                    menuOpen = false;
                  }}
                  class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {$t('app.print')}
                </button>
                <button
                  on:click={() => {
                    handleExport();
                    menuOpen = false;
                  }}
                  class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {$t('app.export')}
                </button>
                <label
                  class="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {$t('app.import')}
                  <input
                    type="file"
                    accept=".json"
                    on:change={(e) => {
                      handleImport(e);
                      menuOpen = false;
                    }}
                    class="hidden"
                  />
                </label>
                <button
                  on:click={() => {
                    handleClear();
                    menuOpen = false;
                  }}
                  class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  {$t('app.clear')}
                </button>
              </div>
            {/if}
          </div>

          <div class="border-l border-gray-200 pl-2 ml-1">
            <Header onSignOut={handleSignOut} />
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
              {migrating ? $t('auth.migrating') : $t('auth.loading')}
            </p>
          </div>
        </div>
      {:else}
        {#if $dataError}
          <div
            class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 print-hidden"
          >
            {$t('auth.error')}: {$dataError}
          </div>
        {/if}

        {#if $isAnonymous}
          <div
            class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 print-hidden"
          >
            {$t('auth.guestMode')}
          </div>
        {/if}

        <div class="print-hidden">
          <ChildList />
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
            <ChartGrid />

            <div class="print-table-break">
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
{/if}

{#if showShareModal}
  <ShareModal
    childId={$activeChild?.id || ''}
    childName={$activeChild?.profile?.name || ''}
    onClose={() => (showShareModal = false)}
  />
{/if}

{#if toast}
  <Toast message={toast.message} type={toast.type} onClose={() => (toast = null)} />
{/if}
