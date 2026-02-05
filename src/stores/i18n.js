import { derived, writable } from 'svelte/store';

const STORAGE_KEY = 'crescere-lang';

const translations = {
  en: {
    'app.title': 'Crescere - Growth Tracker',
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
    'app.footer.disclaimer':
      'This tool is for informational purposes and does not replace professional medical advice.',
    'app.language.label': 'Language',
    'app.language.en': 'English',
    'app.language.pl': 'Polish',
    'profile.title': 'Child Profile',
    'profile.name.label': 'Name (optional)',
    'profile.name.placeholder': "Baby's name",
    'profile.birthDate.label': 'Birth Date *',
    'profile.birthDate.error': 'Some measurements are dated before this birth date',
    'profile.sex.label': 'Sex *',
    'profile.sex.male': 'Male',
    'profile.sex.female': 'Female',
    'profile.age.current': 'Current age:',
    'profile.age.missing': 'Please enter birth date and sex to calculate z-scores.',
    'profile.missingChild': 'Add a child to start tracking measurements.',
    'profile.delete': 'Delete child profile',
    'children.title': 'Children',
    'children.add': 'Add child',
    'children.empty': 'No children yet. Add one to get started.',
    'children.unnamed': 'Child',
    'children.example': 'Example Child',
    'children.example.hint': 'This is demo data. Add your own child to get started.',
    'children.remove': 'Remove profile',
    'children.remove.confirm': 'Remove this profile and all associated measurements?',
    'children.select': 'Select',
    'children.selected': 'Selected',
    'measurements.title': 'Measurements',
    'measurements.zscores': 'Z-Scores & Percentiles',
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
    'chart.waz': 'Weight - Standard Deviation',
    'chart.lhaz': 'Length - Standard Deviation',
    'chart.headcz': 'Head Circumference - Standard Deviation',
    'chart.wflz': 'Weight-for-Length - Standard Deviation',
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
    'chart.weightVelocity.title': 'Weight Gain Rate',
    'chart.lengthVelocity.title': 'Length Gain Rate',
    'chart.maximize': 'Maximize',
    'chart.minimize': 'Close',
    'chart.drag': 'Drag to reorder',
    'chart.group.weight': 'Weight',
    'chart.group.length': 'Length',
    'chart.group.headCirc': 'Head Circumference',
    'chart.group.wfl': 'Weight-for-Length',
    'explain.title': 'What do these indicators mean?',
    'explain.summary':
      "Doctors and midwives don't just look at a child's weight or height alone — they check how these values compare to other children of the same age and sex. This is what Z-scores are for.",
    'explain.meaning':
      'In practice, it answers the question: is the child developing similarly to most children, or noticeably slower or faster?',
    'explain.shortcuts': 'Key abbreviations:',
    'explain.waz.title': 'WAZ (Weight-for-Age)',
    'explain.waz.desc':
      'Checks whether the child weighs appropriately for their age. Helps assess if body weight is too low or too high for the age.',
    'explain.lhaz.title': 'LAZ (Length/Height-for-Age)',
    'explain.lhaz.desc':
      'Shows whether the child is appropriately long (or tall) for their age. This is an indicator of long-term growth.',
    'explain.headcz.title': 'HCZ (Head Circumference-for-Age)',
    'explain.headcz.desc':
      "Compares the child's head circumference to the norm for their age. It's important because it indirectly reflects brain development, especially in infants.",
    'explain.wflz.title': 'WFL (Weight-for-Length)',
    'explain.wflz.desc':
      'Checks whether body weight is proportional to the child\'s length. In other words: is the child "slim", "chubby", or proportional to their height. This indicator is especially used for younger children who are not yet walking.',
    'age.invalid': 'Invalid',
    'age.month': 'm',
    'age.day': 'd',
    'share.copy': 'Copy',
    'share.copied': 'Copied!',
    'share.close': 'Close',
    'share.live.title': 'Share Child',
    'share.live.description':
      "Create named share links so others can view this child's growth data in real-time.",
    'share.live.label.placeholder': 'Label (e.g., Doctor, Grandma)',
    'share.live.create': 'Create Link',
    'share.live.noShares': 'No share links yet. Create one above.',
    'share.live.revoke': 'Revoke',
    'share.live.revoke.confirm': 'Revoke this share link? The recipient will lose access.',
    'share.live.accepted': 'Shared child added to your dashboard!',
    'share.live.alreadyAdded': 'This child is already on your dashboard.',
    'share.live.error': 'Failed to accept share link.',
    'share.live.requiresAuth': 'Sign in to accept shared links.',
    'share.live.sharedBadge': 'Shared',
    'share.live.readOnlyBanner': 'This child is shared with you (read-only).',
    'share.live.remove': 'Remove',
    'share.live.remove.confirm': 'Remove this shared child from your dashboard?',
    'confirm.cancel': 'Cancel',
    'confirm.delete.title': 'Delete child profile',
    'confirm.delete.message':
      'Are you sure you want to delete this child profile? All measurements will be permanently removed.',
    'confirm.measurement.title': 'Delete measurement',
    'confirm.measurement.message': 'Are you sure you want to delete this measurement?',
    'auth.signIn': 'Sign in',
    'auth.signOut': 'Sign out',
    'auth.claimAccount': 'Save account',
    'auth.anonymous': 'Guest',
    'auth.loading': 'Loading...',
    'auth.error': 'Authentication error',
    'auth.emailPlaceholder': 'your@email.com',
    'auth.sendLink': 'Send link',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'Your password',
    'auth.signInWithPassword': 'Sign in',
    'auth.signUp': 'Sign up',
    'auth.signUpWithPassword': 'Create account',
    'auth.switchToPassword': 'Use password instead',
    'auth.switchToMagicLink': 'Use magic link instead',
    'auth.switchToSignUp': "Don't have an account? Sign up",
    'auth.switchToSignIn': 'Already have an account? Sign in',
    'auth.signUpSent': 'Check your email to confirm your account!',
    'auth.emailSent': 'Check your email!',
    'auth.emailSent.claim': 'Check your email to confirm your account!',
    'auth.emailSent.signIn': 'Check your email for a sign-in link!',
    'auth.migrating': 'Migrating your data...',
    'auth.migrated': 'Your data has been migrated to the cloud!',
    'auth.migrated.count': '{count} children migrated',
    'auth.signedInAs': 'Signed in as',
    'auth.guestMode': 'You are using guest mode. Sign in to sync your data across devices.',
    'auth.welcome.title': 'Welcome to Crescere',
    'auth.welcome.description':
      "Track your child's growth using WHO standards. Monitor weight, length, and head circumference with z-score analysis.",
    'auth.welcome.continueAsGuest': 'Continue as Guest',
    'auth.welcome.signInWithEmail': 'Sign In with Email',
    'auth.welcome.guestNote':
      'Guest data is tied to this browser session. Sign in to access your data from any device.',
    'app.footer.storage.cloud': 'Data synced to the cloud',
    'app.menu': 'Menu'
  },
  pl: {
    'app.title': 'Crescere - Monitorowanie wzrostu',
    'app.share': 'Udostępnij',
    'app.export': 'Eksportuj',
    'app.import': 'Importuj',
    'app.clear': 'Wyczyść',
    'app.import.success': 'Dane zaimportowane pomyślnie!',
    'app.import.error': 'Nie udało się zaimportować: nieprawidłowy format pliku',
    'app.clear.confirm':
      'Czy na pewno chcesz usunąć wszystkie dane? Tej operacji nie można cofnąć.',
    'app.footer.source': 'Na podstawie',
    'app.footer.source.link': 'WHO Child Growth Standards',
    'app.footer.storage': 'Dane są przechowywane lokalnie w przeglądarce',
    'app.footer.disclaimer':
      'To narzędzie ma charakter informacyjny i nie zastępuje profesjonalnej porady medycznej.',
    'app.language.label': 'Język',
    'app.language.en': 'Angielski',
    'app.language.pl': 'Polski',
    'profile.title': 'Profil dziecka',
    'profile.name.label': 'Imię (opcjonalnie)',
    'profile.name.placeholder': 'Imię dziecka',
    'profile.birthDate.label': 'Data urodzenia *',
    'profile.birthDate.error': 'Niektóre pomiary mają datę wcześniejszą niż data urodzenia',
    'profile.sex.label': 'Płeć *',
    'profile.sex.male': 'Chłopiec',
    'profile.sex.female': 'Dziewczynka',
    'profile.age.current': 'Aktualny wiek:',
    'profile.age.missing': 'Podaj datę urodzenia i płeć, aby obliczyć z-scores.',
    'profile.missingChild': 'Dodaj dziecko, aby rozpocząć śledzenie pomiarów.',
    'profile.delete': 'Usuń profil dziecka',
    'children.title': 'Dzieci',
    'children.add': 'Dodaj dziecko',
    'children.empty': 'Brak dzieci. Dodaj pierwsze, aby rozpocząć.',
    'children.unnamed': 'Dziecko',
    'children.example': 'Przykładowe dziecko',
    'children.example.hint': 'To są dane demonstracyjne. Dodaj własne dziecko, aby rozpocząć.',
    'children.remove': 'Usuń profil',
    'children.remove.confirm': 'Usunąć ten profil i wszystkie powiązane pomiary?',
    'children.select': 'Wybierz',
    'children.selected': 'Wybrany',
    'measurements.title': 'Pomiary',
    'measurements.zscores': 'Z-Score i percentyle',
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
    'chart.waz': 'Masa - odchylenie standardowe',
    'chart.lhaz': 'Długość - odchylenie standardowe',
    'chart.headcz': 'Obwód głowy - odchylenie standardowe',
    'chart.wflz': 'Masa do długości - odchylenie standardowe',
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
    'chart.weightVelocity.title': 'Tempo przyrostu masy',
    'chart.lengthVelocity.title': 'Tempo przyrostu długości',
    'chart.maximize': 'Powiększ',
    'chart.minimize': 'Zamknij',
    'chart.drag': 'Przeciągnij, aby zmienić kolejność',
    'chart.group.weight': 'Masa',
    'chart.group.length': 'Długość',
    'chart.group.headCirc': 'Obwód głowy',
    'chart.group.wfl': 'Masa do długości',
    'explain.title': 'Co oznaczają te wskaźniki?',
    'explain.summary':
      "Lekarze i położne nie patrzą tylko na samą wagę czy wzrost dziecka, ale sprawdzają jak te wartości wypadają na tle innych dzieci w tym samym wieku i tej samej płci. Do tego służą tzw. Z-score'y.",
    'explain.meaning':
      'W praktyce oznacza to odpowiedź na pytanie: czy dziecko rozwija się podobnie do większości dzieci, czy wyraźnie wolniej albo szybciej?',
    'explain.shortcuts': 'Najważniejsze skróty:',
    'explain.waz.title': 'WAZ (masa do wieku)',
    'explain.waz.desc':
      'Sprawdza, czy dziecko waży odpowiednio do swojego wieku. Pomaga ocenić, czy masa ciała jest zbyt niska lub zbyt wysoka jak na wiek.',
    'explain.lhaz.title': 'LAZ (długość/wzrost do wieku)',
    'explain.lhaz.desc':
      'Pokazuje, czy dziecko jest odpowiednio długie (lub wysokie) jak na swój wiek. To wskaźnik długofalowego wzrastania.',
    'explain.headcz.title': 'HCZ (obwód głowy do wieku)',
    'explain.headcz.desc':
      'Porównuje obwód głowy dziecka z normą dla wieku. Jest ważny, bo pośrednio mówi o rozwoju mózgu, szczególnie u niemowląt.',
    'explain.wflz.title': 'WFL (masa do długości)',
    'explain.wflz.desc':
      'Sprawdza, czy masa ciała jest proporcjonalna do długości dziecka. Innymi słowy: czy dziecko jest „szczupłe", „pulchne" czy proporcjonalne do swojego wzrostu. Ten wskaźnik jest szczególnie używany u młodszych dzieci, które jeszcze nie chodzą.',
    'age.invalid': 'Nieprawidłowy',
    'age.month': 'm',
    'age.day': 'd',
    'share.copy': 'Kopiuj',
    'share.copied': 'Skopiowano!',
    'share.close': 'Zamknij',
    'share.live.title': 'Udostępnij dziecko',
    'share.live.description':
      'Twórz nazwane linki, aby inni mogli przeglądać dane wzrostu tego dziecka w czasie rzeczywistym.',
    'share.live.label.placeholder': 'Etykieta (np. Lekarz, Babcia)',
    'share.live.create': 'Utwórz link',
    'share.live.noShares': 'Brak linków. Utwórz jeden powyżej.',
    'share.live.revoke': 'Cofnij',
    'share.live.revoke.confirm': 'Cofnąć ten link? Odbiorca straci dostęp.',
    'share.live.accepted': 'Udostępnione dziecko dodane do pulpitu!',
    'share.live.alreadyAdded': 'To dziecko jest już na Twoim pulpicie.',
    'share.live.error': 'Nie udało się zaakceptować linku.',
    'share.live.requiresAuth': 'Zaloguj się, aby akceptować udostępnione linki.',
    'share.live.sharedBadge': 'Udostępnione',
    'share.live.readOnlyBanner': 'To dziecko jest Ci udostępnione (tylko do odczytu).',
    'share.live.remove': 'Usuń',
    'share.live.remove.confirm': 'Usunąć to udostępnione dziecko z pulpitu?',
    'confirm.cancel': 'Anuluj',
    'confirm.delete.title': 'Usuń profil dziecka',
    'confirm.delete.message':
      'Czy na pewno chcesz usunąć ten profil dziecka? Wszystkie pomiary zostaną trwale usunięte.',
    'confirm.measurement.title': 'Usuń pomiar',
    'confirm.measurement.message': 'Czy na pewno chcesz usunąć ten pomiar?',
    'auth.signIn': 'Zaloguj',
    'auth.signOut': 'Wyloguj',
    'auth.claimAccount': 'Zapisz konto',
    'auth.anonymous': 'Gość',
    'auth.loading': 'Ładowanie...',
    'auth.error': 'Błąd autoryzacji',
    'auth.emailPlaceholder': 'twoj@email.pl',
    'auth.sendLink': 'Wyślij link',
    'auth.password': 'Hasło',
    'auth.passwordPlaceholder': 'Twoje hasło',
    'auth.signInWithPassword': 'Zaloguj się',
    'auth.signUp': 'Zarejestruj się',
    'auth.signUpWithPassword': 'Utwórz konto',
    'auth.switchToPassword': 'Użyj hasła',
    'auth.switchToMagicLink': 'Użyj linku magicznego',
    'auth.switchToSignUp': 'Nie masz konta? Zarejestruj się',
    'auth.switchToSignIn': 'Masz już konto? Zaloguj się',
    'auth.signUpSent': 'Sprawdź email, aby potwierdzić konto!',
    'auth.emailSent': 'Sprawdź email!',
    'auth.emailSent.claim': 'Sprawdź email, aby potwierdzić konto!',
    'auth.emailSent.signIn': 'Sprawdź email — znajdziesz tam link do logowania!',
    'auth.migrating': 'Migrowanie danych...',
    'auth.migrated': 'Twoje dane zostały przeniesione do chmury!',
    'auth.migrated.count': 'Zmigrowano {count} dzieci',
    'auth.signedInAs': 'Zalogowano jako',
    'auth.guestMode':
      'Używasz trybu gościa. Zaloguj się, aby synchronizować dane między urządzeniami.',
    'auth.welcome.title': 'Witaj w Crescere',
    'auth.welcome.description':
      'Śledź wzrost swojego dziecka na podstawie standardów WHO. Monitoruj masę, długość i obwód głowy z analizą z-score.',
    'auth.welcome.continueAsGuest': 'Kontynuuj jako gość',
    'auth.welcome.signInWithEmail': 'Zaloguj się przez email',
    'auth.welcome.guestNote':
      'Dane gościa są powiązane z tą sesją przeglądarki. Zaloguj się, aby mieć dostęp z dowolnego urządzenia.',
    'app.footer.storage.cloud': 'Dane zsynchronizowane z chmurą',
    'app.menu': 'Menu'
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
