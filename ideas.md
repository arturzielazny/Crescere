# Crescere - Improvement Ideas

## UX Issues

- ☑ **Header is too crowded on mobile.** Fixed — Export, Import, Clear, and language selector collapse into a kebab menu on mobile. Share and auth stay visible.
- ☐ **No sync status feedback.** When a measurement is saved to Supabase, nothing tells the user it worked (or failed). The optimistic update looks instant, but if the network call fails, the rollback happens silently — data just disappears with no explanation.
- ☐ **"Clear" button is dangerous and prominent.** It's a red button in the top bar next to Export/Import. One misclick and a confirm dialog is all that stands between the user and total data loss. This should be buried in settings or at least not red and prominent.
- ☐ **No way to undo measurement deletion.** Delete is instant (optimistic) with only a confirm dialog. No toast with "Undo" option.
- ☐ **Measurement table is hard to use on mobile.** Seven columns on a phone screen. Even with horizontal scroll, it's painful.
- ☐ **Example child is confusing for new users.** A guest gets pre-filled fake data. They might think it's real or not understand they should delete it. There's no onboarding that explains what they're looking at.
- ☐ **Charts have no empty state.** If a child has no measurements, charts render empty with just reference bands. No helpful message like "Add measurements to see growth charts."

## Data & Feature Gaps

- ☐ **Limited to 0-5 years.** WHO data only covers 0-1826 days. No way to track older children. Should at least show a message explaining this limit, and ideally support WHO 5-19 year references.
- ☐ **No percentile display.** Parents and doctors think in percentiles ("90th percentile"), not z-scores. Adding percentile conversion would make it much more accessible.
- ☐ **No growth velocity / rate of change.** Clinicians care about the trend, not just the current point. "Is the child gaining weight faster or slower than expected?" is unanswered.
- ☐ **No BMI calculation.** Weight-for-length is shown, but BMI (common for 2+ years) is missing.
- ☐ **No notes on measurements.** Parents might want to note "sick this week" or "started solids" next to a measurement.
- ☐ **Date input allows invalid values.** Future birth dates, measurements dated before birth, or dates far in the future are all accepted without warning.

## Technical Improvements

- ☐ **No offline support.** If Supabase is configured but the network is down, the app breaks. A service worker caching strategy would let it work offline and sync when back online.
- ☐ **No conflict resolution.** If two devices edit the same child simultaneously, last-write-wins with no warning. Data can be silently overwritten.
- ☑ **Export in Supabase mode exports raw store data.** Fixed — exports from store instead of empty localStorage.
- ☐ **No data backup/recovery for anonymous users.** If an anonymous user's session expires or they clear cookies, their data is orphaned in Supabase forever. Could offer a recovery code or QR code as backup.
- ☐ **Bundle size (553 KB).** Chart.js is the biggest contributor. Code splitting the chart components behind a dynamic import would improve initial load.
- ☐ **No rate limiting on auth actions.** Users can spam "Send link" button repeatedly. Should debounce or disable after first send with a cooldown timer.

## Polish & Quality of Life

- ☐ **No print view.** Parents often want to print growth charts for doctor visits. Current layout doesn't print well.
- ☐ **No date range filtering on charts.** Charts show all data. Can't zoom into last 3 months.
- ☐ **Drag-to-reorder charts is desktop-only.** No touch drag support for mobile users.
- ☐ **Share URLs can be very long.** A child with many measurements produces a URL that might exceed URL length limits or be unwieldy to share.
- ☐ **No multi-child chart comparison.** Can't overlay two siblings' growth curves to compare.
- ☐ **Missing keyboard shortcuts.** No way to navigate between children, add measurements, or switch chart views from keyboard.
- ☑ **Live child sharing via Supabase.** Implemented — named share links with management UI. Recipients get read-only access with live data. Snapshot sharing preserved for non-Supabase mode.
