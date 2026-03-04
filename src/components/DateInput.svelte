<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import flatpickr from 'flatpickr';
  import { Polish } from 'flatpickr/dist/l10n/pl.js';
  import 'flatpickr/dist/flatpickr.min.css';
  import { language } from '../stores/i18n.js';

  export let value = '';
  export let cssClass = '';
  export let disabled = false;

  const dispatch = createEventDispatcher();

  let input;
  let fp;

  function getLocale(lang) {
    return lang === 'pl' ? Polish : 'default';
  }

  function getAltFormat(lang) {
    return lang === 'pl' ? 'j M Y' : 'M j, Y';
  }

  onMount(() => {
    fp = flatpickr(input, {
      dateFormat: 'Y-m-d',
      altInput: true,
      altInputClass: cssClass,
      altFormat: getAltFormat($language),
      defaultDate: value || undefined,
      locale: getLocale($language),
      disableMobile: true,
      onChange([selectedDate]) {
        if (!selectedDate) return;
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        dispatch('change', { value: `${y}-${m}-${d}` });
      }
    });
    if (disabled && fp.altInput) {
      fp.altInput.disabled = true;
    }
  });

  $: if (fp) {
    fp.set('locale', getLocale($language));
    fp.set('altFormat', getAltFormat($language));
  }

  $: if (fp && value !== undefined) {
    const cur = fp.selectedDates[0];
    const curISO = cur
      ? `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      : '';
    if (curISO !== value) fp.setDate(value || null, false);
  }

  onDestroy(() => {
    if (fp) fp.destroy();
  });
</script>

<input bind:this={input} class={cssClass} {disabled} />
