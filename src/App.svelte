<script>
  import { onMount, onDestroy } from 'svelte';
  import ChildProfile from './components/ChildProfile.svelte';
  import ChildList from './components/ChildList.svelte';
  import MeasurementTable from './components/MeasurementTable.svelte';
  import ChartGrid from './components/ChartGrid.svelte';
  import ShareModal from './components/ShareModal.svelte';
  import Toast from './components/Toast.svelte';
  import Header from './components/Header.svelte';
  import WelcomeScreen from './components/WelcomeScreen.svelte';
  import {
    childStore,
    activeChild,
    setStore,
    resetStore,
    createExampleState,
    addTemporaryChild,
    discardTemporaryChild,
    temporaryChildId,
    sharedChildIds,
    dataLoading,
    dataError,
    enableSync,
    disableSync,
    syncChildToBackend,
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
  import {
    loadFromStorage,
    saveToStorage,
    exportData,
    clearStorage,
    migrateData
  } from './lib/storage.js';
  import { migrateToSupabase, hasLocalData } from './lib/migrate.js';
  import {
    generateShareUrl,
    parseShareUrl,
    parseLiveShareUrl,
    clearShareHash
  } from './lib/share.js';
  import { availableLanguages, language, setLanguage, t } from './stores/i18n.js';

  let loaded = false;
  let showWelcome = false;
  let showShareModal = false;
  let shareUrl = '';
  let toast = null;
  let migrating = false;

  // Check if Supabase is configured
  const supabaseConfigured =
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  function checkForSharedChild() {
    // Check for snapshot share first
    const sharedChild = parseShareUrl();
    if (sharedChild) {
      discardTemporaryChild();
      addTemporaryChild(sharedChild);
      clearShareHash();
      return;
    }

    // Check for live share
    checkForLiveShare();
  }

  async function checkForLiveShare() {
    const token = parseLiveShareUrl();
    if (!token) return;

    clearShareHash();

    if (!supabaseConfigured || !$isAuthenticated) {
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

    // Load data from Supabase
    await enableSync();

    // If no data exists, create example state
    if ($childStore.children.length === 0) {
      const exampleState = createExampleState($t('children.example'));
      setStore(exampleState);

      // Sync example child to backend so measurements can be added
      if (exampleState.activeChildId) {
        try {
          await syncChildToBackend(exampleState.activeChildId);
        } catch (err) {
          console.error('Failed to sync example child:', err);
        }
      }
    }
  }

  async function initializeApp() {
    if (supabaseConfigured) {
      // Initialize auth
      await initAuth();

      // If no session, show welcome screen instead of auto-signing in
      if (!$isAuthenticated && !$authLoading) {
        showWelcome = true;
        loaded = true;
        return;
      }

      // Already authenticated - load data
      await loadAuthenticatedData();
    } else {
      // Fallback: localStorage-only mode (no Supabase configured)
      const saved = loadFromStorage();
      if (saved) {
        setStore(saved);
      } else {
        setStore(createExampleState($t('children.example')));
      }
    }

    // Check for share URL and add as temporary child
    checkForSharedChild();

    loaded = true;
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
    checkForSharedChild();
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
    window.addEventListener('hashchange', checkForSharedChild);
  });

  onDestroy(() => {
    window.removeEventListener('hashchange', checkForSharedChild);
  });

  // Auto-save on changes (only in localStorage-only mode)
  $: if (loaded && $childStore && !supabaseConfigured) {
    const tempId = $temporaryChildId;
    const dataToSave = tempId
      ? {
          ...$childStore,
          children: $childStore.children.filter((c) => c.id !== tempId),
          activeChildId:
            $childStore.activeChildId === tempId
              ? $childStore.children.find((c) => c.id !== tempId)?.id || null
              : $childStore.activeChildId
        }
      : $childStore;
    saveToStorage(dataToSave);
  }

  function handleExport() {
    if (supabaseConfigured) {
      // In Supabase mode, export from the store (not localStorage)
      const data = { ...$childStore, version: 2 };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `growth-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      exportData();
    }
  }

  function handleClear() {
    if (confirm($t('app.clear.confirm'))) {
      clearStorage();
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

        if (!supabaseConfigured) {
          saveToStorage($childStore);
        }
        toast = { message: $t('app.import.success'), type: 'success' };
      } catch (_err) {
        toast = { message: $t('app.import.error'), type: 'error' };
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // Whether to use live sharing mode
  $: useLiveShare =
    supabaseConfigured &&
    $isAuthenticated &&
    !$isAnonymous &&
    $activeChild &&
    !$sharedChildIds.has($activeChild?.id);

  function handleShare() {
    if ($activeChild) {
      if (!useLiveShare) {
        shareUrl = generateShareUrl($activeChild);
      }
      showShareModal = true;
    }
  }

  $: isLoading = $authLoading || $dataLoading || migrating;
  $: footerStorageText =
    supabaseConfigured && $isAuthenticated && !$isAnonymous
      ? $t('app.footer.storage.cloud')
      : $t('app.footer.storage');
</script>

{#if showWelcome}
  <WelcomeScreen onContinueAsGuest={handleContinueAsGuest} />
{:else}
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow-sm">
      <div class="px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold text-gray-800">
          {$t('app.title')}
        </h1>
        <div class="flex gap-2 items-center">
          <label for="language-select" class="text-sm text-gray-600 hidden sm:block">
            {$t('app.language.label')}
          </label>
          <select
            id="language-select"
            value={$language}
            on:change={(event) => setLanguage(event.target.value)}
            class="px-2 py-1.5 text-sm border border-gray-200 rounded bg-white"
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
            disabled={!$activeChild}
            class="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {$t('app.share')}
          </button>
          <button
            on:click={handleExport}
            class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            {$t('app.export')}
          </button>
          <label class="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded cursor-pointer">
            {$t('app.import')}
            <input type="file" accept=".json" on:change={handleImport} class="hidden" />
          </label>
          <button
            on:click={handleClear}
            class="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded"
          >
            {$t('app.clear')}
          </button>
          {#if supabaseConfigured}
            <div class="border-l border-gray-200 pl-2 ml-1">
              <Header onSignOut={handleSignOut} />
            </div>
          {/if}
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
          <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {$t('auth.error')}: {$dataError}
          </div>
        {/if}

        {#if supabaseConfigured && $isAnonymous}
          <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            {$t('auth.guestMode')}
          </div>
        {/if}

        <ChildList />
        <ChildProfile />
        <MeasurementTable />

        <ChartGrid />

        <section class="bg-white rounded-lg shadow p-6 mt-6">
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
      {/if}
    </main>

    <footer class="text-center py-4 text-sm text-gray-500">
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
    url={shareUrl}
    liveMode={useLiveShare}
    childId={$activeChild?.id || ''}
    childName={$activeChild?.profile?.name || ''}
    onClose={() => (showShareModal = false)}
  />
{/if}

{#if toast}
  <Toast message={toast.message} type={toast.type} onClose={() => (toast = null)} />
{/if}
