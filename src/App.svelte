<script>
  import { onMount } from 'svelte';
  import ChildProfile from './components/ChildProfile.svelte';
  import ChildList from './components/ChildList.svelte';
  import MeasurementTable from './components/MeasurementTable.svelte';
  import GrowthMetricChart from './components/GrowthMetricChart.svelte';
  import ZScoreChart from './components/ZScoreChart.svelte';
  import { childStore, setStore, resetStore, createExampleState } from './stores/childStore.js';
  import { loadFromStorage, saveToStorage, exportData, clearStorage } from './lib/storage.js';
  import { availableLanguages, language, setLanguage, t } from './stores/i18n.js';

  let loaded = false;

  onMount(() => {
    const saved = loadFromStorage();
    if (saved) {
      setStore(saved);
    } else {
      setStore(createExampleState());
    }
    loaded = true;
  });

  // Auto-save on changes
  $: if (loaded) {
    saveToStorage($childStore);
  }

  function handleExport() {
    exportData();
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
        const data = JSON.parse(e.target.result);
        setStore(data);
        saveToStorage($childStore);
        alert($t('app.import.success'));
      } catch (err) {
        alert($t('app.import.error'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }
</script>

<div class="min-h-screen bg-gray-100">
  <header class="bg-white shadow-sm">
    <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
      <h1 class="text-xl font-bold text-gray-800">
        {$t('app.title')}
      </h1>
      <div class="flex gap-2 items-center">
        <label class="text-sm text-gray-600 hidden sm:block">
          {$t('app.language.label')}
        </label>
        <select
          value={$language}
          on:change={(event) => setLanguage(event.target.value)}
          class="px-2 py-1.5 text-sm border border-gray-200 rounded bg-white"
          aria-label={$t('app.language.label')}
        >
          {#each availableLanguages as lang}
            <option value={lang}>
              {$t(`app.language.${lang}`)}
            </option>
          {/each}
        </select>
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
      </div>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-4 py-6">
    <ChildList />
    <ChildProfile />
    <MeasurementTable />

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      <GrowthMetricChart metric="weight" title={$t('chart.weight.title')} unit="g" />
      <GrowthMetricChart metric="length" title={$t('chart.length.title')} unit="cm" />
      <GrowthMetricChart metric="headCirc" title={$t('chart.head.title')} unit="cm" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <ZScoreChart metric="waz" title={$t('chart.waz')} />
      <ZScoreChart metric="lhaz" title={$t('chart.lhaz')} />
      <ZScoreChart metric="headcz" title={$t('chart.headcz')} />
      <ZScoreChart metric="wflz" title={$t('chart.wflz')} />
    </div>

    <section class="bg-white rounded-lg shadow p-6 mt-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-2">{$t('explain.title')}</h2>
      <p class="text-sm text-gray-600 mb-3">
        {$t('explain.summary')}
      </p>
      <ul class="text-sm text-gray-600 space-y-1">
        <li>{$t('explain.waz')}</li>
        <li>{$t('explain.lhaz')}</li>
        <li>{$t('explain.headcz')}</li>
        <li>{$t('explain.wflz')}</li>
      </ul>
      <p class="text-sm text-gray-600 mt-3">
        {$t('explain.calc')}
      </p>
    </section>
  </main>

  <footer class="text-center py-4 text-sm text-gray-500">
    <p>
      {$t('app.footer.source')}{' '}
      <a href="https://www.who.int/tools/child-growth-standards" class="text-blue-600 hover:underline" target="_blank">
        {$t('app.footer.source.link')}
      </a>
    </p>
    <p class="mt-1">{$t('app.footer.storage')}</p>
  </footer>
  </div>
