# Task STATUS-VIEW-1 — Supabase Health Monitor Dashboard View

**Agent**: code-writer
**Task ID**: STATUS-VIEW-1
**Date**: 2025

## Summary

Created `src/components/haji/supabase-status-view.tsx` — a comprehensive Supabase monitoring dashboard that consumes the existing `useSupabaseHealth` hook (`@/hooks/use-supabase-health`) and renders all 15 required panels in a responsive grid layout.

## File Created (1)

### `src/components/haji/supabase-status-view.tsx` (~810 lines)

**Imports**:
- `useSupabaseHealth` + type-only imports `HealthState`, `ConnectionState`, `HealthLevel` from `@/hooks/use-supabase-health`
- shadcn/ui: `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `Button`, `Badge`, `Progress`, full `Table` family (`Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow`)
- lucide-react (22 icons): Activity, AlertTriangle, Bell, CheckCircle2, Database, Eye, FileWarning, Globe, HardDrive, Hash, HeartPulse, History, Link2, Loader2, RefreshCw, Server, ShieldCheck, Timer, UserCheck, Users, Wifi, Zap
- `cn` from `@/lib/utils`

**Helpers implemented**:
- `fmtTime(iso)` — formats ISO → `id-ID` locale `dd MMM yyyy, HH:mm:ss`, returns "—" for null/invalid.
- `Row({ label, value, mono })` — flex key-value row with bottom border (last:border-0), supports monospace value, auto-fallback to "—" for null/empty.
- `StatusBadge({ ok, labelOk, labelBad })` — emerald CheckCircle2 / rose AlertTriangle badge.
- `SystemStatusBadge({ level, onColor })` — works on white cards (emerald/amber/rose chips) AND colored gradient hero (translucent white chip with backdrop blur).

**15 Panels implemented** (each as a separate small component):
1. `ConnectionHero` — gradient banner with ring-2 outline. 🟢/🔴/🟡/🔵 per `ConnectionState` (connected=emerald/teal, disconnected=rose/red, connecting=amber/orange, reconnecting=sky/cyan). Shows project name, last-checked time, animated spinner while checking, translucent SystemStatusBadge overlay, progress bar overlay while checking.
2. `SiPulangHajiPanel` — 6 stat cards (`grid-cols-2 sm:grid-cols-3`) + 3 Row entries (Last Sync / Realtime Chat pill / Last Backup) + SystemStatusBadge footer.
3. `ProjectInfoPanel` — name, ID, URL (mono), region, environment (Badge).
4. `DatabasePanel` — StatusBadge(connected) + Connected/Response Time/Last Query/Server Timestamp/Timezone rows.
5. `AuthPanel` — ✅ Auth Running / ❌ Auth Error badge + Running/Error rows.
6. `RealtimePanel` — colored status pill (connected=emerald, reconnecting=amber, disconnected=rose) + Active Channels + Health row.
7. `StoragePanel` — StatusBadge + Connected/Bucket Count/Error rows + scrollable bucket list (`max-h-40 overflow-y-auto`) with public/private badges.
8. `EdgeFunctionPanel` — Active (emerald) / Inactive (outline) badge + Status/Function/Error rows.
9. `ApiPanel` — StatusBadge(reachable) + Reachable/HTTP Status/Network Error rows.
10. `LatencyPanel` — large color-coded ping value (green<300ms / amber 300-1000ms / rose>1000ms), average (last 10 samples), level badge, custom progress bar with `0ms / 300ms / 1000ms / 2000ms+` markers.
11. `SessionPanel` — StatusBadge(active && !expired) + Current User/Active/Expired/Login Time/Last Refresh/Expires At rows.
12. `SyncPanel` — Last Sync/Pending/Success (emerald)/Failed (rose) rows.
13. `TableHealthPanel` — grid (`grid-cols-1 sm:grid-cols-2`) of 7 tables with ✅ Accessible (emerald bg) / ❌ Error (rose bg) + truncated error text. Header description shows accessible/total count.
14. `RecordCountsPanel` — 6 count cards (`grid-cols-2 sm:grid-cols-3`) for Jamaah/Chat/TTV/Skrining/Lab/User with distinct colored icons + `toLocaleString("id-ID")`.
15. `ErrorLogPanel` — scrollable table (`max-h-96 overflow-y-auto`) with sticky header, empty state with CheckCircle2, columns Time/Type(badge)/Message(mono).

**Main view** (`SupabaseStatusView`):
- Consumes `const { state, refresh } = useSupabaseHealth()`.
- Header: page title + last-updated time + "Auto-refresh 30s" Badge (pulsing amber dot while checking, emerald while idle) + Refresh Button (disabled while `state.checking`, shows Loader2 spin).
- `<Progress value={65} className="h-1" />` shown between header and hero while `state.checking` is true (covers initial load + each manual/auto refresh).
- Layout: `max-w-7xl mx-auto p-4 sm:p-6 space-y-4`.
- Order: Header → Progress (while checking) → ConnectionHero → SiPulangHajiPanel (full width) → 2-col grid (lg:grid-cols-2) of ProjectInfo/Database/Auth/Realtime/Storage/EdgeFunctions/Api/Latency/Session/Sync → TableHealthPanel (full width) → RecordCountsPanel (full width) → ErrorLogPanel (full width).

**Styling/UX details**:
- Color palette matches project conventions: emerald (positive/healthy), rose (error/disconnected), amber (warning/reconnecting), sky/cyan (info), teal/purple/sky accents for icons. NO indigo or blue.
- Mobile-first responsive: stat/count sub-cards use `grid-cols-2 sm:grid-cols-3`; main grid uses `grid-cols-1 lg:grid-cols-2`.
- Long URLs/IDs use `break-words` + `font-mono text-xs`; table health cells use `truncate` for long error messages; error log table cells use `whitespace-normal` for wrapping.
- Semantic HTML: `<header>`, `<section>` wrappers.
- Accessibility: all icons decorative; titles via `<CardTitle>` + `<CardDescription>`; touch targets ≥44px (Button size=sm + stat cards with generous padding).

## Verification

- `bun run lint` → exit 0 (PASS, no errors, no warnings).
- Dev log (`tail -30 dev.log`) shows no new errors — standard Next.js Ready + GET / 200 entries only.

## Notes for Future Agents

- This view is **self-contained** — it does NOT modify any other file. It only consumes the `useSupabaseHealth` hook (which itself wraps the `@/lib/supabase/client` browser client + manages a realtime channel).
- The hook auto-refreshes every 30s and on `visibilitychange`, so the view updates automatically — no extra interval needed in the component.
- The hook's retry-on-disconnect logic (3s delay → re-check) will visibly flip the ConnectionHero from 🟡 → 🔴 → 🔵 → 🟢 (or back to 🔴 if still failing).
- Latency color zones in the LatencyPanel (`fast < 300ms`, `normal 300-1000ms`, `slow > 1000ms`) match the hook's `latencyLevel()` function.
- The `SystemStatusBadge` `onColor` variant is intentionally simple (translucent white) so it reads on any of the 4 gradient hero backgrounds — if the hero gradient colors change, this badge still works.
- To mount this view from the app shell, add a new view option to the Zustand nav store and render `<SupabaseStatusView />` when selected — see `src/components/haji/app-shell.tsx` for the existing view-switching pattern.
