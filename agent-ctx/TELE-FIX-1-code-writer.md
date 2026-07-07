# Task TELE-FIX-1 — Telemedicine Frontend → Direct Supabase Migration

**Agent**: code-writer
**Task ID**: TELE-FIX-1
**Date**: 2025

## Summary

Replaced 4 missing/broken telemedicine API endpoint calls (`/api/telemedicine/rooms`, `/api/telemedicine/dashboard`, `/api/telemedicine/rooms/${id}/read`, `/api/telemedicine/rooms/${id}/message`, `/api/telemedicine/rooms/${jamaahId}`) with direct Supabase browser-client queries, using the helpers already exported from `@/lib/supabase/telemedicine.ts`.

## Files Modified (4)

### 1. `src/components/haji/telemedicine/telemedicine-view.tsx`
- Added imports: `loadRoomsList`, `markRoomReadByDoctor`, `subscribeToRoomsList`, `type RoomListItem as SupabaseRoom` from `@/lib/supabase/telemedicine`. Also added `ChatSenderType`, `ChatMessageType` from `@/lib/telemedicine-types` (needed for snake_case → camelCase mapping of `lastMessage`).
- Changed local `RoomListItem.jamaah` from `JamaahData` → `JamaahData | null` (Supabase helper returns nullable jamaah).
- Added `mapSupabaseRoom` useCallback helper that converts Supabase `RoomListItem` (camelCase fields but snake_case `lastMessage: ChatMessageRow`) → local `RoomListItem` (camelCase `lastMessage: ChatMessageData`). When `jamaah` is present, it is mapped to a minimal `JamaahData` with sensible defaults for fields not returned by the helper (porsi, alamat, hp, etc — set to "" / null).
- Replaced `fetch("/api/telemedicine/rooms")` with `loadRoomsList()` + `.map(mapSupabaseRoom)`. Errors handled via `toast.error()` with Supabase error message.
- Replaced `fetch("/api/telemedicine/rooms/${r.jamaahId}/read", { method: "POST" })` with `markRoomReadByDoctor(r.id)` (note: uses `r.id` = room.id, NOT jamaahId). Wrapped in `.catch()` for non-fatal logging.
- Added `subscribeToRoomsList()` subscription in a `useEffect` with 400ms debounce — single channel "chat_room:all" listening for changes on `chat_room` + `chat_message` tables. On change, debounced `load()` + `setDashRefresh((k) => k + 1)` to refresh dashboard widget. Cleanup clears the timeout + unsubscribes the channel.
- Added defensive null check in `RoomRow`: if `room.jamaah` is null, renders a placeholder row ("Jamaah tidak ditemukan" + last message content + unread badge). Otherwise renders the normal avatar/name/risk row.

### 2. `src/components/haji/telemedicine/telemedicine-dashboard-widget.tsx`
- Added import: `loadTelemedicineDashboardStats` from `@/lib/supabase/telemedicine`.
- Replaced `fetch("/api/telemedicine/dashboard")` + `await res.json() as DashboardStats` with `await loadTelemedicineDashboardStats()`. The helper returns FLAT shape `{ stats: { unread, pendingForms, highRisk, online, followUp }, error }` — destructured and assigned to state. Errors handled via `setError()` + safe `setStats({...zeroes})` fallback (same behavior as before).

### 3. `src/components/haji/telemedicine/conversation-panel.tsx`
- Added imports: `createClient` from `@/lib/supabase/client`, `ensureRoom` from `@/lib/supabase/telemedicine`. Added type imports `TelemedicineCategory`, `RequestStatus`, `FormField` from `@/lib/telemedicine-types` (needed for mapping `telemedicine_request` rows).
- Replaced `load()` function:
  - **Null-ID validation**: returns early (silent, no error toast) if `!jamaahId`.
  - **Load jamaah**: `supabase.from("jamaah").select("*").eq("id", jamaahId).maybeSingle()`. Maps all 28 snake_case columns → camelCase `JamaahData` (id, nama, nik, kloter, porsi, usia, kelamin, alamat, hp, kontak_keluarga→kontakKeluarga, tanggal_tiba→tanggalTiba, bandara, kabupaten_kota→kabupatenKota, puskesmas, dokter_keluarga→dokterKeluarga, paspor, embarkasi, gol_darah→golDarah, riwayat_penyakit→riwayatPenyakit, riwayat_operasi→riwayatOperasi, alergi, obat_rutin→obatRutin, status_istithaah→statusIstithaah, tanggal_berangkat→tanggalBerangkat, tanggal_pulang→tanggalPulang, risk_level→riskLevel, risk_summary→riskSummary, created_at→createdAt, updated_at→updatedAt). On jamaah not found, falls back to `jamaahProp`. On DB error, warns to console and continues.
  - **Ensure room**: `ensureRoom(jamaahId, "doctor")`. If error or no room, warns and clears `requests`, returns early.
  - **Fetch pending requests**: `supabase.from("telemedicine_request").select("*").eq("room_id", room.id).eq("status", "PENDING").order("created_at", { ascending: false })`. Maps snake_case → camelCase `TelemedicineRequestData` (id, room_id→roomId, jamaah_id→jamaahId, category, sub_type→subType, title, fields (JSON.parse with try/catch), status, scheduled_for→scheduledFor, submitted_at→submittedAt, response (JSON.parse with try/catch, nullable), skor, hari_ke→hariKe, created_at→createdAt).
  - All errors handled with `console.warn` + graceful fallback. Whole function wrapped in try/catch.
- Fixed `sendText()`:
  - Removed debug `console.log` statements.
  - Added null-ID validation: silent return if `!jamaahId` (no toast).
  - On success (`inserted` truthy): `setInput("")` + `toast.success("Pesan terkirim")`.
  - On failure (`inserted` null): `toast.error("Gagal mengirim pesan")` (previously silently cleared input).

### 4. `src/components/haji/telemedicine/simple-action-dialogs.tsx`
- Added imports: `createClient` from `@/lib/supabase/client`, `ensureRoom` and `sendChatMessage` from `@/lib/supabase/telemedicine`.
- **EdukasiFormDialog.handleSend()**: Replaced 2 fetches with:
  1. `ensureRoom(jamaahId, "doctor")` — throws if error.
  2. `supabase.from("telemedicine_request").insert({ room_id, jamaah_id, category: "EDUKASI", sub_type: topic, title, fields: JSON.stringify([]), status: "PENDING" }).select().single()` — gets the new request `id`.
  3. `sendChatMessage(room.id, { senderType: "DOCTOR", type: "EDUKASI", content: title, requestId: newReq.id })`.
  4. If `pesan.trim()`: also `sendChatMessage(room.id, { senderType: "DOCTOR", type: "TEXT", content: pesan.trim() })`.
  5. `toast.success("Edukasi terkirim")` on success; `toast.error(...)` on any error.
- **ObatFormDialog.handleSend()**: Replaced 2 fetches with:
  1. Validate `pesan.trim()` (preserved existing validation toast).
  2. `ensureRoom(jamaahId, "doctor")`.
  3. `supabase.from("telemedicine_request").insert({ room_id, jamaah_id, category: "OBAT", sub_type: "OBAT", title: "Instruksi Pengobatan", fields: JSON.stringify([]), status: "PENDING" }).select().single()`.
  4. `sendChatMessage(room.id, { senderType: "DOCTOR", type: "OBAT", content: pesan.trim(), requestId: newReq.id })`.
  5. `toast.success("Instruksi obat terkirim")` on success.
- **FileSendDialog.handleSend()**: Replaced 1 fetch with:
  1. `ensureRoom(jamaahId, "doctor")`.
  2. `sendChatMessage(room.id, { senderType: "DOCTOR", type: fileType, content: caption || "[Label]", attachmentName: "placeholder-...bin" })`.
  3. `toast.success("${label} terkirim")` on success.

## Verification

- `bun run lint` → exit 0 (PASS, no errors, no warnings).
- Verified that all 4 previously-missing endpoints are no longer called from the 4 fixed files (grep confirmed only `ai-summary-panel.tsx`, `ttv-form-dialog.tsx`, `smart-monitoring-dialog.tsx`, `skrining-form-dialog.tsx`, `patient-form-fill-dialog.tsx` still call `/api/telemedicine/*` — and those routes ALL exist on disk per `find src/app/api/telemedicine -name route.ts`).
- Dev log (`tail -50 dev.log`) shows no new errors after edits — only the standard Next.js ready + initial GET / 200.

## Notes for Future Agents

- The `subscribeToRoomsList` Supabase channel handles realtime auto-refresh independently of the legacy socket.io `onMessage` handler in `telemedicine-view.tsx`. Both are kept — socket.io handler still does in-place optimistic updates for the case where socket.io is connected; the Supabase subscription is the source-of-truth fallback that triggers a full reload + dashboard refresh on any DB change.
- The `RoomData` interface and `getRoomId` helper in `conversation-panel.tsx` are now unused (the new `load()` doesn't use them). Left in place to minimize diff and per task rule "Preserve all existing props, state, and rendering logic" — ESLint config has `no-unused-vars` disabled so they don't break lint.
- The local `RoomListItem.jamaah` was changed from `JamaahData` → `JamaahData | null`. All consumers of `room.jamaah` in `telemedicine-view.tsx` already used optional chaining (`x.jamaah?.nama`), so the type change was safe. The only direct-access consumer was `RoomRow`, which now defensively returns a placeholder row when `jamaah` is null.
- Other telemedicine dialogs (`ttv-form-dialog.tsx`, `skrining-form-dialog.tsx`) still use `fetch("/api/telemedicine/rooms/${jamaahId}/request")` — these calls hit the LIVE backend route (PRISMA-FIX-B migrated it to Supabase server admin client), so they work. Out of scope for TELE-FIX-1.
