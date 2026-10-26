# Crescere - Improvement Ideas

## UX Issues

- ☑ **Header is too crowded on mobile.** Fixed — Export, Import, Clear, and language selector collapse into a kebab menu on mobile. Share and auth stay visible.
- ☑ **No sync status feedback.** Fixed — a failed save is rolled back and reported in a toast with a Retry button (`syncError` in `childStore.js`). A failed initial load shows a banner with Reload.
- ☐ **"Clear" button is dangerous and prominent.** It's a red button in the top bar next to Export/Import. One misclick and a confirm dialog is all that stands between the user and total data loss. This should be buried in settings or at least not red and prominent.
- ☑ **No way to undo measurement deletion.** Fixed — deleting a measurement no longer asks for confirmation; a toast offers Undo for 6 seconds (`restoreMeasurement`).
- ☑ **Measurement table is hard to use on mobile.** Fixed — the inline table is gone at every width: an "Add measurement" button and the history list both open a bottom sheet (`MeasurementSheet.svelte`) with labelled fields. Weight can be typed in grams or kilograms, with dot or comma decimals.
- ☑ **Example child is confusing for new users.** Fixed — example child is now client-side only (never synced to the backend), shown with green indicator and a demo banner. Auto-removed when user adds their first real child. Cleaned up 8 previously synced example children from production DB.
- ☑ **Charts have no empty state.** Fixed — a chart with nothing to plot shows a message instead (the gain-rate chart asks for two measurements, an incomplete profile asks for birth date and sex).
- ☑ **Ability to login with password.** Fixed — email + password sign-in. Guest accounts are saved via `claimAccount()` (same user ID, data kept). Magic links were dropped in the move to Cloudflare Workers + D1, since nothing sends email.


## Data & Feature Gaps

- ☐ **Limited to 0-5 years.** WHO data only covers 0-1826 days. No way to track older children. Should at least show a message explaining this limit, and ideally support WHO 5-19 year references.
- ☑ **No percentile display.** Fixed — added zToPercentile() using Abramowitz & Stegun CDF approximation. Percentiles show below z-scores in the measurement table and in chart tooltips. Locale-aware: English ordinals ("50th") and Polish dot notation ("50.").
- ☑ **No growth velocity / rate of change.** Fixed — added velocity charts showing average daily gain (g/day for weight, cm/day for length) between consecutive measurements, plotted at midpoint ages. Tooltips show age range, rate, and absolute change. Y-axis range excludes first-week data to prevent the dramatic post-birth drop from dominating the scale.
- ☐ **No BMI calculation.** Weight-for-length is shown, but BMI (common for 2+ years) is missing.
- ☐ **No notes on measurements.** Parents might want to note "sick this week" or "started solids" next to a measurement.
- ☑ **Date input allows invalid values.** Fixed — measurements dated before birth are rejected, a future birth date shows a warning, and values more than 5 SD from the WHO median need a second "Save anyway" click. Future measurement dates stay allowed (planned measurements) and are labelled "planned".

## Technical Improvements

- ☐ **No offline support.** If the network is down, the app breaks. A service worker caching strategy would let it work offline and sync when back online.
- ☐ **No conflict resolution.** If two devices edit the same child simultaneously, last-write-wins with no warning. Data can be silently overwritten.
- ☑ **Export exported raw store data.** Fixed — exports from store instead of empty localStorage. localStorage fallback mode has since been removed entirely.
- ☐ **No self-service password reset.** There is no email, so a forgotten password can only be reset by the operator (`node scripts/set-password.js <email> --remote`). A recovery code shown when saving the account would let users do it themselves.
- ☐ **Signing in as a guest drops the guest's children.** `handleLogin` replaces the guest session, and the cleanup cron then deletes the guest user with its children. The sign-in dialog warns about this and suggests export/import; merging the guest's children into the signed-in account would remove the trap.
- ☐ **No data backup/recovery for anonymous users.** If an anonymous user's session expires or they clear cookies, their data becomes unreachable (the daily cleanup cron then deletes guests with no sessions left). Could offer a recovery code or QR code as backup.
- ☐ **Bundle size (553 KB).** Chart.js is the biggest contributor. Code splitting the chart components behind a dynamic import would improve initial load.
- ☑ **Backend hosting kept pausing the free-tier project.** Fixed — the backend runs on Cloudflare Workers + D1 (`worker/`, `migrations/`), which doesn't pause idle projects. Magic links and email verification were dropped in the move.
- ☑ **No rate limiting on auth actions.** Fixed — added client-side rate limiting in `withAuthLoading()`. 2s cooldown for password/anonymous actions, Only successful calls consume the cooldown so users can retry after errors. The Worker also rate limits auth endpoints per IP (`AUTH_LIMITER` binding, 10/min per action), so this client-side layer is primarily a UX guard against accidental double-submits.

## Polish & Quality of Life

- ☑ **No print view.** Fixed — added Print button and `@media print` stylesheet. Hides UI chrome, shows a report header with child name/DOB/sex/age, renders charts full-width with page-break protection, starts z-score table on a new page. Uses `print-color-adjust: exact` for accurate chart colors.
- ☐ **No date range filtering on charts.** Charts show all data. Can't zoom into last 3 months.
- ☑ **Drag-to-reorder charts is desktop-only.** Resolved — charts are now one tabbed panel (group tabs + view switch), so there is nothing to reorder. A "Now" summary card above it shows the latest values and percentiles.
- ☑ **Share URLs can be very long.** Fixed — removed snapshot URL sharing (LZ-String compression). Sharing now uses short token-based live links only.
- ☐ **No multi-child chart comparison.** Can't overlay two siblings' growth curves to compare.
- ☐ **Missing keyboard shortcuts.** No way to navigate between children, add measurements, or switch chart views from keyboard.
- ☑ **Live child sharing.** Implemented — named share links with management UI. Recipients get read-only access with live data.
