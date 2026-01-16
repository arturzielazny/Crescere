import { derived, writable } from 'svelte/store';

const STORAGE_KEY = 'who-growth-tracker-lang';

const translations = {
  en: {
    'app.title': 'WHO Growth Tracker',
    'app.share': 'Share',
    'app.export': 'Export',
    'app.import': 'Import',
    'app.clear': 'Clear',
    'app.import.success': 'Data imported successfully!',
    'app.import.error': 'Failed to import: Invalid file format',
    'app.clear.confirm': 'Are you sure you want to delete all data? This cannot be undone.',
    'app.footer.source': 'Based on',
    'app.footer.source.link': 'WHO Child Growth Standards',
    'app.footer.storage': 'Data stored locally in your browser',
    'app.language.label': 'Language',
    'app.language.en': 'English',
    'app.language.pl': 'Polish',
    'profile.title': 'Child Profile',
    'profile.name.label': 'Name (optional)',
    'profile.name.placeholder': "Baby's name",
    'profile.birthDate.label': 'Birth Date *',
    'profile.sex.label': 'Sex *',
    'profile.sex.male': 'Male',
    'profile.sex.female': 'Female',
    'profile.age.current': 'Current age:',
    'profile.age.missing': 'Please enter birth date and sex to calculate z-scores.',
    'profile.missingChild': 'Add a child to start tracking measurements.',
    'children.title': 'Children',
    'children.add': 'Add child',
    'children.empty': 'No children yet. Add one to get started.',
    'children.unnamed': 'Child',
    'children.remove': 'Remove child',
    'children.remove.confirm': 'Remove this child and all associated measurements?',
    'measurements.title': 'Measurements',
    'measurements.date': 'Date',
    'measurements.age': 'Age',
    'measurements.weight': 'Weight (g)',
    'measurements.length': 'Length (cm)',
    'measurements.head': 'Head (cm)',
    'measurements.waz': 'Weight-for-Age (WAZ)',
    'measurements.lhaz': 'Length-for-Age (LAZ)',
    'measurements.headcz': 'Head Circ-for-Age (HCZ)',
    'measurements.wflz': 'Weight-for-Length (WFL)',
    'measurements.delete.confirm': 'Delete this measurement?',
    'measurements.delete.title': 'Delete',
    'measurements.add': 'Add',
    'measurements.empty': 'No measurements yet. Add your first measurement above.',
    'measurements.missingChild': 'Select a child to view and edit measurements.',
    'chart.all': 'All Z-Scores',
    'chart.waz': 'Weight-for-Age',
    'chart.lhaz': 'Length-for-Age',
    'chart.headcz': 'Head Circ-for-Age',
    'chart.wflz': 'Weight-for-Length',
    'chart.title': 'Z-Scores Over Time',
    'chart.axis.age': 'Age (days)',
    'chart.axis.zscore': 'Z-Score',
    'chart.reference.median': 'Median',
    'chart.reference.sd2plus': '+2 SD',
    'chart.reference.sd2minus': '-2 SD',
    'chart.tooltip.capped': 'capped',
    'chart.band.sd1': '±1 SD band',
    'chart.band.sd2': '±2 SD band',
    'chart.measurement.label': 'Measurement',
    'chart.now': 'Now',
    'chart.weight.title': 'Weight Over Time',
    'chart.length.title': 'Length Over Time',
    'chart.head.title': 'Head Circumference Over Time',
    'explain.title': 'About Z-Scores',
    'explain.summary': "Z-scores show how a measurement compares to WHO reference data for a child's age and sex.",
    'explain.waz': 'WAZ (Weight-for-Age): compares weight to age.',
    'explain.lhaz': 'LAZ (Length-for-Age): compares length/height to age.',
    'explain.headcz': 'HCZ (Head Circumference-for-Age): compares head size to age.',
    'explain.wflz': 'WFL (Weight-for-Length): compares weight to length (used for younger ages).',
    'explain.calc': 'Calculated with the WHO LMS method (L, M, S parameters) and bounded z-scores for extreme values.',
    'age.invalid': 'Invalid',
    'age.month': 'm',
    'age.day': 'd',
    'share.title': 'Share Child Data',
    'share.description': 'Copy this link to share this child\'s growth data. The recipient can add this child to their tracker.',
    'share.copy': 'Copy',
    'share.copied': 'Copied!',
    'share.close': 'Close',
    'share.urlLength': 'URL length',
    'share.chars': 'characters',
    'share.import.title': 'Import Shared Child',
    'share.import.description': 'Someone shared a child\'s growth data with you. Would you like to add this child to your tracker?',
    'share.import.name': 'Name',
    'share.import.measurements': 'Measurements',
    'share.import.confirm': 'Add Child',
    'share.import.cancel': 'Cancel'
  },
  pl: {
    'app.title': 'WHO Growth Tracker',
    'app.share': 'Udostępnij',
    'app.export': 'Eksportuj',
    'app.import': 'Importuj',
    'app.clear': 'Wyczyść',
    'app.import.success': 'Dane zaimportowane pomyślnie!',
    'app.import.error': 'Nie udało się zaimportować: nieprawidłowy format pliku',
    'app.clear.confirm': 'Czy na pewno chcesz usunąć wszystkie dane? Tej operacji nie można cofnąć.',
    'app.footer.source': 'Na podstawie',
    'app.footer.source.link': 'WHO Child Growth Standards',
    'app.footer.storage': 'Dane są przechowywane lokalnie w przeglądarce',
    'app.language.label': 'Język',
    'app.language.en': 'Angielski',
    'app.language.pl': 'Polski',
    'profile.title': 'Profil dziecka',
    'profile.name.label': 'Imię (opcjonalnie)',
    'profile.name.placeholder': 'Imię dziecka',
    'profile.birthDate.label': 'Data urodzenia *',
    'profile.sex.label': 'Płeć *',
    'profile.sex.male': 'Chłopiec',
    'profile.sex.female': 'Dziewczynka',
    'profile.age.current': 'Aktualny wiek:',
    'profile.age.missing': 'Podaj datę urodzenia i płeć, aby obliczyć z-scores.',
    'profile.missingChild': 'Dodaj dziecko, aby rozpocząć śledzenie pomiarów.',
    'children.title': 'Dzieci',
    'children.add': 'Dodaj dziecko',
    'children.empty': 'Brak dzieci. Dodaj pierwsze, aby rozpocząć.',
    'children.unnamed': 'Dziecko',
    'children.remove': 'Usuń dziecko',
    'children.remove.confirm': 'Usunąć to dziecko i wszystkie powiązane pomiary?',
    'measurements.title': 'Pomiary',
    'measurements.date': 'Data',
    'measurements.age': 'Wiek',
    'measurements.weight': 'Masa (g)',
    'measurements.length': 'Długość (cm)',
    'measurements.head': 'Obwód głowy (cm)',
    'measurements.waz': 'Masa do wieku (WAZ)',
    'measurements.lhaz': 'Długość do wieku (LAZ)',
    'measurements.headcz': 'Obwód głowy do wieku (HCZ)',
    'measurements.wflz': 'Masa do długości (WFL)',
    'measurements.delete.confirm': 'Usunąć ten pomiar?',
    'measurements.delete.title': 'Usuń',
    'measurements.add': 'Dodaj',
    'measurements.empty': 'Brak pomiarów. Dodaj pierwszy pomiar powyżej.',
    'measurements.missingChild': 'Wybierz dziecko, aby przeglądać i edytować pomiary.',
    'chart.all': 'Wszystkie Z-scores',
    'chart.waz': 'Masa do wieku',
    'chart.lhaz': 'Długość do wieku',
    'chart.headcz': 'Obwód głowy do wieku',
    'chart.wflz': 'Masa do długości',
    'chart.title': 'Z-scores w czasie',
    'chart.axis.age': 'Wiek (dni)',
    'chart.axis.zscore': 'Z-score',
    'chart.reference.median': 'Mediana',
    'chart.reference.sd2plus': '+2 SD',
    'chart.reference.sd2minus': '-2 SD',
    'chart.tooltip.capped': 'ograniczony',
    'chart.band.sd1': 'Pasmo ±1 SD',
    'chart.band.sd2': 'Pasmo ±2 SD',
    'chart.measurement.label': 'Pomiar',
    'chart.now': 'Teraz',
    'chart.weight.title': 'Masa w czasie',
    'chart.length.title': 'Długość w czasie',
    'chart.head.title': 'Obwód głowy w czasie',
    'explain.title': 'O Z-scores',
    'explain.summary': 'Z-scores pokazują, jak pomiar wypada na tle norm WHO dla wieku i płci.',
    'explain.waz': 'WAZ (masa do wieku): porównuje masę z wiekiem.',
    'explain.lhaz': 'LAZ (długość do wieku): porównuje długość/wzrost z wiekiem.',
    'explain.headcz': 'HCZ (obwód głowy do wieku): porównuje obwód głowy z wiekiem.',
    'explain.wflz': 'WFL (masa do długości): porównuje masę z długością (dla młodszych dzieci).',
    'explain.calc': 'Obliczenia bazują na metodzie LMS WHO (parametry L, M, S) z ograniczeniem wartości skrajnych.',
    'age.invalid': 'Nieprawidłowy',
    'age.month': 'm',
    'age.day': 'd',
    'share.title': 'Udostępnij dane dziecka',
    'share.description': 'Skopiuj ten link, aby udostępnić dane wzrostu tego dziecka. Odbiorca może dodać to dziecko do swojego trackera.',
    'share.copy': 'Kopiuj',
    'share.copied': 'Skopiowano!',
    'share.close': 'Zamknij',
    'share.urlLength': 'Długość URL',
    'share.chars': 'znaków',
    'share.import.title': 'Importuj udostępnione dziecko',
    'share.import.description': 'Ktoś udostępnił Ci dane wzrostu dziecka. Czy chcesz dodać to dziecko do swojego trackera?',
    'share.import.name': 'Imię',
    'share.import.measurements': 'Pomiary',
    'share.import.confirm': 'Dodaj dziecko',
    'share.import.cancel': 'Anuluj'
  }
};

const availableLanguages = Object.keys(translations);

function normalizeLanguage(value) {
  if (!value) return 'en';
  const lower = value.toLowerCase();
  if (lower.startsWith('pl')) return 'pl';
  if (lower.startsWith('en')) return 'en';
  return 'en';
}

function getInitialLanguage() {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeLanguage(stored);
  }

  if (typeof navigator !== 'undefined') {
    return normalizeLanguage(navigator.language);
  }

  return 'en';
}

const initialLanguage = getInitialLanguage();
const language = writable(initialLanguage);

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
}

function setLanguage(nextLanguage) {
  const normalized = normalizeLanguage(nextLanguage);
  language.set(normalized);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, normalized);
  }

  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
}

const t = derived(language, ($language) => (key) => {
  return translations[$language]?.[key] ?? translations.en[key] ?? key;
});

export { availableLanguages, language, setLanguage, t };
