# Crescere - Improvement Ideas

## UX Issues

- ☑ **Header is too crowded on mobile.** Fixed — Export, Import, Clear, and language selector collapse into a kebab menu on mobile. Share and auth stay visible.
- ☐ **No sync status feedback.** When a measurement is saved to Supabase, nothing tells the user it worked (or failed). The optimistic update looks instant, but if the network call fails, the rollback happens silently — data just disappears with no explanation.
- ☐ **"Clear" button is dangerous and prominent.** It's a red button in the top bar next to Export/Import. One misclick and a confirm dialog is all that stands between the user and total data loss. This should be buried in settings or at least not red and prominent.
- ☐ **No way to undo measurement deletion.** Delete is instant (optimistic) with only a confirm dialog. No toast with "Undo" option.
- ☐ **Measurement table is hard to use on mobile.** Seven columns on a phone screen. Even with horizontal scroll, it's painful.
- ☑ **Example child is confusing for new users.** Fixed — example child is now client-side only (never synced to Supabase), shown with green indicator and a demo banner. Auto-removed when user adds their first real child. Cleaned up 8 previously synced example children from production DB.
- ☐ **Charts have no empty state.** If a child has no measurements, charts render empty with just reference bands. No helpful message like "Add measurements to see growth charts."
- ☑ **Ability to login with password.** Fixed — added email+password sign-in and sign-up flows alongside magic link. Anonymous accounts can be upgraded via `linkWithPassword()`.


## Data & Feature Gaps

- ☐ **Limited to 0-5 years.** WHO data only covers 0-1826 days. No way to track older children. Should at least show a message explaining this limit, and ideally support WHO 5-19 year references.
- ☑ **No percentile display.** Fixed — added zToPercentile() using Abramowitz & Stegun CDF approximation. Percentiles show below z-scores in the measurement table and in chart tooltips. Locale-aware: English ordinals ("50th") and Polish dot notation ("50.").
- ☑ **No growth velocity / rate of change.** Fixed — added velocity charts showing average daily gain (g/day for weight, cm/day for length) between consecutive measurements, plotted at midpoint ages. Tooltips show age range, rate, and absolute change. Y-axis range excludes first-week data to prevent the dramatic post-birth drop from dominating the scale.
- ☐ **No BMI calculation.** Weight-for-length is shown, but BMI (common for 2+ years) is missing.
- ☐ **No notes on measurements.** Parents might want to note "sick this week" or "started solids" next to a measurement.
- ☐ **Date input allows invalid values.** Future birth dates, measurements dated before birth, or dates far in the future are all accepted without warning.

## Technical Improvements

- ☐ **No offline support.** If Supabase is configured but the network is down, the app breaks. A service worker caching strategy would let it work offline and sync when back online.
- ☐ **No conflict resolution.** If two devices edit the same child simultaneously, last-write-wins with no warning. Data can be silently overwritten.
- ☑ **Export in Supabase mode exports raw store data.** Fixed — exports from store instead of empty localStorage. localStorage fallback mode has since been removed entirely (Supabase is always configured in production).
- ☐ **No data backup/recovery for anonymous users.** If an anonymous user's session expires or they clear cookies, their data is orphaned in Supabase forever. Could offer a recovery code or QR code as backup.
- ☐ **Bundle size (553 KB).** Chart.js is the biggest contributor. Code splitting the chart components behind a dynamic import would improve initial load.
- ☑ **No rate limiting on auth actions.** Fixed — added client-side rate limiting in `withAuthLoading()`. 2s cooldown for password/anonymous actions, 10s for email-sending actions (magic link, account linking). Only successful calls consume the cooldown so users can retry after errors. Note: Supabase already enforces its own server-side rate limits (e.g. email sending is capped at ~3/hour per address, auth endpoints return 429 on abuse), so this client-side layer is primarily a UX guard against accidental double-submits rather than a security boundary.

## Polish & Quality of Life

- ☑ **No print view.** Fixed — added Print button and `@media print` stylesheet. Hides UI chrome, shows a report header with child name/DOB/sex/age, renders charts full-width with page-break protection, starts z-score table on a new page. Uses `print-color-adjust: exact` for accurate chart colors.
- ☐ **No date range filtering on charts.** Charts show all data. Can't zoom into last 3 months.
- ☐ **Drag-to-reorder charts is desktop-only.** No touch drag support for mobile users.
- ☑ **Share URLs can be very long.** Fixed — removed snapshot URL sharing (LZ-String compression). Sharing now uses short Supabase token-based live links only.
- ☐ **No multi-child chart comparison.** Can't overlay two siblings' growth curves to compare.
- ☐ **Missing keyboard shortcuts.** No way to navigate between children, add measurements, or switch chart views from keyboard.
- ☑ **Live child sharing via Supabase.** Implemented — named share links with management UI. Recipients get read-only access with live data. Snapshot sharing preserved for non-Supabase mode.
