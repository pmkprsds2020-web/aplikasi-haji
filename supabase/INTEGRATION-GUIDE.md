# Supabase Integration Guide — SiHaji Care

## 1. Run the SQL Schema

1. Go to **Supabase Dashboard → SQL Editor → New query**
2. Open `supabase/schema-simple.sql` — copy the entire contents
3. Paste into the SQL Editor → click **Run**

This creates **20 tables** with RLS policies:

| Table | Purpose | user_id / doctor_id |
|-------|---------|---------------------|
| `profiles` | User profiles (linked to auth.users) | `id = auth.uid()` |
| `jamaah` | Patients (EHHR core) | `user_id`, `doctor_id` → auth.users |
| `screening` | Pasca haji screenings | `jamaah_id` → jamaah |
| `vital_sign` | Pasca haji vitals | `jamaah_id` → jamaah |
| `pasca_hajj_lab` | Pasca haji labs | `jamaah_id` → jamaah |
| `pre_hajj_vital` | Pre-hajj vitals | `jamaah_id` → jamaah |
| `pre_hajj_lab` | Pre-hajj labs | `jamaah_id` → jamaah |
| `pre_hajj_chronic` | Chronic diseases | `jamaah_id` → jamaah |
| `pre_hajj_screening` | Pre-hajj screenings | `jamaah_id` → jamaah |
| `pre_hajj_medication` | Medications | `jamaah_id` → jamaah |
| `pre_hajj_immunization` | Immunizations | `jamaah_id` → jamaah |
| `pre_hajj_fitness` | Fitness records | `jamaah_id` → jamaah |
| `pre_hajj_education` | Education checklist | `jamaah_id` → jamaah |
| `pre_hajj_ai_assessment` | AI assessments | `jamaah_id` → jamaah |
| `chat_room` | Chat rooms | `jamaah_id`, `doctor_id` |
| `chat_message` | Chat messages | `room_id` → chat_room |
| `telemedicine_request` | Form requests | `jamaah_id` → jamaah |
| `telemedicine_template` | Message templates | (all authenticated) |
| `telemedicine_schedule` | Scheduled reminders | `jamaah_id` → jamaah |
| `telemedicine_ai_summary` | AI chat summaries | `jamaah_id` → jamaah |

### RLS Policy Model

```
Doctor (staff role):  SELECT/INSERT/UPDATE on all jamaah + child tables
Jamaah (patient):     SELECT/INSERT only on own data (user_id = auth.uid())
Chat:                 Any authenticated user can read/write
```

## 2. Supabase Client (already configured)

**`.env`** (already set):
```env
NEXT_PUBLIC_SUPABASE_URL=https://rkbmbyhofygwaucgqcpb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_LcTXzU8qf3o3B6vpNZCDmA_bJroz-ir
```

**Browser client** (`src/lib/supabase/client.ts`):
```ts
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

**Server client** (`src/lib/supabase/server.ts`):
```ts
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

## 3. Data-Access Hook — `useSupabaseData`

The main data-access layer is in **`src/hooks/use-supabase-data.ts`**. It provides all CRUD operations:

### Loading Data

```tsx
import { useSupabaseData } from "@/hooks/use-supabase-data";

function DashboardView() {
  const { loadJamaahList, loadDashboardStats } = useSupabaseData();
  const [jamaahList, setJamaahList] = React.useState([]);
  const [stats, setStats] = React.useState({ total: 0, merah: 0, kuning: 0, hijau: 0 });

  React.useEffect(() => {
    (async () => {
      const list = await loadJamaahList();       // SELECT * FROM jamaah
      const s = await loadDashboardStats();       // aggregate risk levels
      setJamaahList(list);
      setStats(s);
    })();
  }, []);

  return <div>...</div>;
}
```

### Loading a Single Jamaah with All Related Data

```tsx
const { loadJamaahDetail } = useSupabaseData();

const detail = await loadJamaahDetail(jamaahId);
// detail contains: jamaah + screenings + vital_signs + pasca_hajj_labs
//   + pre_hajj_vitals + pre_hajj_labs + pre_hajj_chronic + pre_hajj_screenings
//   + pre_hajj_medications + pre_hajj_immunizations + pre_hajj_fitness + pre_hajj_education
```

### Creating Items

```tsx
const { createJamaah, createVitalSign, createScreening, createPascaLab } = useSupabaseData();

// Create new patient
const jamaah = await createJamaah({
  nama: "H. Ahmad", nik: "3201...", kloter: "JKT-08", porsi: "H-2024-001",
  usia: 65, kelamin: "L", tanggalTiba: "2026-06-21T00:00:00Z",
  bandara: "Soekarno-Hatta", // ... other fields
});

// Record vital signs
await createVitalSign(jamaahId, {
  tdSistolik: 140, tdDiastolik: 90, nadi: 80, rr: 18,
  suhu: 36.7, spo2: 98, beratBadan: 65, gulaDarah: 110,
}, 1); // hariKe = 1

// Record screening
await createScreening(jamaahId, {
  jenis: "INFECTIOUS", data: { demam: true, batuk: true },
  skor: "Tinggi", hariKe: 1,
});

// Record pasca haji lab
await createPascaLab(jamaahId, {
  gdp: 180, hba1c: 8.2, kolesterol: 220, // ... other fields
});
```

### Updating Items

```tsx
const { updateJamaah, upsertPreHajjChronic, upsertPreHajjEducation } = useSupabaseData();

// Update patient
await updateJamaah(jamaahId, { nama: "H. Ahmad Suryana", hp: "0812..." });

// Upsert chronic diseases (one record per jamaah)
await upsertPreHajjChronic(jamaahId, {
  hipertensi: "Tidak Terkontrol", diabetes: "Terkontrol",
});

// Upsert education checklist
await upsertPreHajjEducation(jamaahId, {
  diet: true, aktivitas: true, obat: true,
});
```

### Deleting Items

```tsx
const { deleteJamaah, deletePreHajjMedication, deletePreHajjImmunization } = useSupabaseData();

// Soft delete patient (sets is_active = false)
await deleteJamaah(jamaahId);

// Delete medication
await deletePreHajjMedication(medicationId);

// Delete immunization
await deletePreHajjImmunization(immunizationId);
```

## 4. Chat (Realtime via Supabase)

The chat already uses Supabase directly via `src/hooks/use-supabase-chat.ts`:

```tsx
import { useSupabaseChat } from "@/hooks/use-supabase-chat";

const { messages, sendMessage, loading } = useSupabaseChat(jamaahId);

// Send message → INSERT into chat_message → Realtime auto-syncs
await sendMessage({ senderType: "DOCTOR", type: "TEXT", content: "Hello" });
```

## 5. Authentication

Already configured via `src/contexts/supabase-auth-context.tsx`:

```tsx
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";

const { user, role, isStaff, signIn, signUp, signOut } = useSupabaseAuth();
```

## 6. File Summary

| File | Purpose |
|------|---------|
| `supabase/schema-simple.sql` | **SQL schema** — 20 tables + RLS + Realtime + seed |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `src/hooks/use-supabase-data.ts` | **Data-access hook** — all CRUD operations |
| `src/hooks/use-supabase-chat.ts` | Chat hook with Realtime |
| `src/contexts/supabase-auth-context.tsx` | Auth context (session, role, signIn/signUp/signOut) |
| `src/proxy.ts` | Session refresh middleware |
| `.env` | Supabase credentials |

## 7. Migration Status

- ✅ **Supabase Auth**: Live (email/password, multi-role, auto-profile)
- ✅ **Supabase Database**: Schema ready (SQL to run in dashboard)
- ✅ **Supabase Realtime**: Enabled for chat_message, chat_room, vital_sign, screening
- ✅ **Data-access layer**: `useSupabaseData` hook with full CRUD
- ✅ **Chat**: Already Supabase-direct (useSupabaseChat)
- ✅ **Jamaah views**: Already Supabase-direct (dashboard, riwayat, chat, profil)
- ⚠️ **Doctor views**: Still use Prisma API routes (can be progressively replaced with `useSupabaseData`)

To fully migrate doctor views, replace `fetch('/api/jamaah')` calls with `useSupabaseData().loadJamaahList()` etc. The hook is ready — just swap the data source in each component.
