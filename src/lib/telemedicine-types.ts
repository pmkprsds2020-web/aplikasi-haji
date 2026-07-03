// Tipe & kontrak untuk modul Telemedicine Monitoring
// Kontrak bersama backend API, mini-service socket.io, dan frontend UI

// ===== Tipe pesan & enum =====

export type ChatSenderType = "DOCTOR" | "JAMAAH" | "SYSTEM" | "AI";

export type ChatMessageType =
  | "TEXT"
  | "VOICE"
  | "IMAGE"
  | "FILE"
  | "PDF"
  | "LOCATION"
  | "STICKER"
  | "TTV_REQUEST"
  | "SKRINING_REQUEST"
  | "EDUKASI"
  | "OBAT"
  | "MONITORING"
  | "TTV_RESULT"
  | "SKRINING_RESULT"
  | "ALERT"
  | "TEMPLATE";

export type TelemedicineCategory =
  | "TTV"
  | "SKRINING"
  | "EDUKASI"
  | "OBAT"
  | "DAILY_COMPLAINT"
  | "CHRONIC";

export type RequestStatus = "PENDING" | "SUBMITTED" | "EXPIRED";

export type AlertLevel = "RED" | "ORANGE" | "YELLOW";

// ===== Data shape (client) =====

export interface ChatRoomData {
  id: string;
  jamaahId: string;
  doctorId: string;
  lastMessageAt: string;
  unreadByDoctor: number;
  unreadByJamaah: number;
  createdAt: string;
}

export interface ChatMessageData {
  id: string;
  roomId: string;
  senderType: ChatSenderType;
  senderName: string | null;
  type: ChatMessageType;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  requestId: string | null;
  readByDoctor: boolean;
  readByJamaah: boolean;
  createdAt: string;
}

export interface TelemedicineRequestData {
  id: string;
  roomId: string;
  jamaahId: string;
  category: TelemedicineCategory;
  subType: string | null;
  title: string;
  fields: FormField[];
  status: RequestStatus;
  scheduledFor: string | null;
  submittedAt: string | null;
  response: Record<string, unknown> | null;
  skor: string | null;
  hariKe: number | null;
  createdAt: string;
}

export interface TelemedicineTemplateData {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
}

export interface TelemedicineScheduleData {
  id: string;
  jamaahId: string;
  category: TelemedicineCategory;
  subType: string | null;
  title: string;
  hariKe: number | null;
  timeOfDay: string | null;
  active: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

export interface TelemedicineAiSummaryData {
  id: string;
  jamaahId: string;
  roomId: string;
  ringkasan: string;
  soap: string | null;
  assessment: string | null;
  plan: string | null;
  prioritas: string | null;
  rekomendasi: Array<{ kategori: string; tindakan: string; urutan: number }> | null;
  alerts: Array<{ level: AlertLevel; detail: string }> | null;
  createdAt: string;
}

// ===== Definisi field form telemedicine =====

export interface FormField {
  key: string;
  label: string;
  type: "number" | "text" | "yesno" | "radio" | "textarea" | "select";
  unit?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
}

// ===== Definisi form TTV (parameter yang bisa dipilih dokter) =====

export const TTV_PARAMS: { key: string; label: string; unit: string }[] = [
  { key: "tdSistolik", label: "Tekanan Darah Sistolik", unit: "mmHg" },
  { key: "tdDiastolik", label: "Tekanan Darah Diastolik", unit: "mmHg" },
  { key: "nadi", label: "Nadi", unit: "×/mnt" },
  { key: "rr", label: "Respirasi", unit: "×/mnt" },
  { key: "suhu", label: "Suhu", unit: "°C" },
  { key: "spo2", label: "SpO₂", unit: "%" },
  { key: "beratBadan", label: "Berat Badan", unit: "kg" },
  { key: "tinggiBadan", label: "Tinggi Badan", unit: "cm" },
  { key: "gulaDarah", label: "Gula Darah", unit: "mg/dL" },
  { key: "lingkarPerut", label: "Lingkar Perut", unit: "cm" },
];

// ===== Definisi form skrining yang bisa dikirim =====

export interface SkriningFormDef {
  jenis: string; // INFECTIOUS | MENTAL | FRAILTY | ... (pasca) atau PHQ9|GAD7|... (pra)
  label: string;
  phase: "PRA" | "PASCA";
}

export const SKRINING_FORMS_PASCA: SkriningFormDef[] = [
  { jenis: "INFECTIOUS", label: "Skrining Penyakit Menular", phase: "PASCA" },
  { jenis: "MENTAL", label: "PHQ-9 & GAD-7 (Mental)", phase: "PASCA" },
  { jenis: "FRAILTY", label: "FRAIL Scale", phase: "PASCA" },
  { jenis: "FALL_RISK", label: "Risiko Jatuh", phase: "PASCA" },
  { jenis: "NUTRITION", label: "Nutrisi (MNA-SF)", phase: "PASCA" },
  { jenis: "SLEEP", label: "Kualitas Tidur (ISI)", phase: "PASCA" },
  { jenis: "ACTIVITY", label: "Aktivitas Fisik", phase: "PASCA" },
  { jenis: "SPIRITUAL", label: "Spiritual", phase: "PASCA" },
  { jenis: "FAMILY_APGAR", label: "Family APGAR", phase: "PASCA" },
];

export const SKRINING_FORMS_PRA: SkriningFormDef[] = [
  { jenis: "FRAIL", label: "FRAIL Scale", phase: "PRA" },
  { jenis: "MNA", label: "MNA-SF (Nutrisi)", phase: "PRA" },
  { jenis: "MINICOG", label: "Mini-Cog (Kognitif)", phase: "PRA" },
  { jenis: "MORSE", label: "Morse Fall Scale", phase: "PRA" },
  { jenis: "BARTHEL", label: "Barthel Index (ADL)", phase: "PRA" },
  { jenis: "PHQ9", label: "PHQ-9 (Depresi)", phase: "PRA" },
  { jenis: "GAD7", label: "GAD-7 (Cemas)", phase: "PRA" },
  { jenis: "APGAR", label: "Family APGAR", phase: "PRA" },
];

// ===== Daftar quick actions di chat =====

export interface QuickAction {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { key: "ttv", label: "Kirim TTV", icon: "Activity", color: "emerald" },
  { key: "skrining", label: "Kirim Skrining", icon: "ClipboardList", color: "violet" },
  { key: "edukasi", label: "Kirim Edukasi", icon: "GraduationCap", color: "sky" },
  { key: "obat", label: "Kirim Obat", icon: "Pill", color: "amber" },
  { key: "monitoring", label: "Jadwalkan Monitoring", icon: "CalendarClock", color: "rose" },
  { key: "file", label: "Kirim File", icon: "Paperclip", color: "slate" },
  { key: "ai", label: "AI Recommendation", icon: "Sparkles", color: "teal" },
];

// ===== Template pesan bawaan =====

export const DEFAULT_TEMPLATES = [
  { title: "Pengingat TTV Pagi", category: "TEXT", content: "Selamat pagi. Silakan isi tekanan darah, suhu, dan saturasi hari ini. Terima kasih." },
  { title: "Pengingat Skrining PHQ-9", category: "SKRINING", content: "Mohon isi skrining PHQ-9 untuk evaluasi kesehatan mental Anda." },
  { title: "Pengingat Minum Obat", category: "TEXT", content: "Jangan lupa minum obat pagi ini sesuai resep dokter." },
  { title: "Cek Keluhan Harian", category: "TEXT", content: "Bagaimana kondisi Bapak/Ibu hari ini? Ada keluhan demam, batuk, atau sesak?" },
];

// ===== Alert thresholds (rule-based AI auto-alert) =====

export interface AlertRule {
  param: string;
  label: string;
  condition: ">=" | "<=" | "<" | ">";
  threshold: number;
  level: AlertLevel;
  message: string;
}

export const ALERT_RULES: AlertRule[] = [
  { param: "spo2", label: "SpO₂", condition: "<", threshold: 94, level: "RED", message: "Hipoksia — SpO₂ di bawah 94%. Segera hubungi pasien, pertimbangkan rujukan." },
  { param: "suhu", label: "Suhu", condition: ">=", threshold: 38, level: "RED", message: "Demam — suhu ≥38°C. Evaluasi sumber infeksi." },
  { param: "tdSistolik", label: "TD Sistolik", condition: ">=", threshold: 180, level: "RED", message: "Hipertensi Emergensi — TD sistolik ≥180 mmHg." },
  { param: "tdDiastolik", label: "TD Diastolik", condition: ">=", threshold: 110, level: "RED", message: "Hipertensi Emergensi — TD diastolik ≥110 mmHg." },
  { param: "gulaDarah", label: "Gula Darah", condition: ">=", threshold: 250, level: "ORANGE", message: "Hiperglikemia — gula darah ≥250 mg/dL." },
  { param: "gulaDarah", label: "Gula Darah", condition: "<", threshold: 60, level: "RED", message: "Hipoglikemia — gula darah <60 mg/dL. Berikan glukosa segera." },
  { param: "nadi", label: "Nadi", condition: ">", threshold: 120, level: "RED", message: "Takikardi berat — nadi >120×/menit." },
  { param: "rr", label: "RR", condition: ">=", threshold: 25, level: "RED", message: "Dispnea — frekuensi napas ≥25×/menit." },
];

// ===== Smart Telemonitoring: definisi per fase =====

export interface SmartMonitoringPhase {
  key: string;
  label: string;
  condition: string; // kapan dipakai
  forms: { category: TelemedicineCategory; subType: string; title: string }[];
}

export const SMART_MONITORING_PHASES: SmartMonitoringPhase[] = [
  {
    key: "PRA",
    label: "Pra Haji",
    condition: "Sebelum berangkat",
    forms: [
      { category: "TTV", subType: "tdSistolik,tdDiastolik,nadi,rr,suhu,spo2,beratBadan,tinggiBadan,lingkarPerut", title: "TTV Mingguan Pra Haji" },
      { category: "CHRONIC", subType: "HIPERTENSI", title: "Monitoring Hipertensi" },
      { category: "CHRONIC", subType: "DIABETES", title: "Monitoring Diabetes" },
      { category: "SKRINING", subType: "FRAIL", title: "Skrining Frailty" },
      { category: "EDUKASI", subType: "obat", title: "Edukasi Kepatuhan Obat" },
    ],
  },
  {
    key: "PASCA_1",
    label: "Pasca Haji Hari 1",
    condition: "Hari 1 setelah tiba",
    forms: [
      { category: "TTV", subType: "tdSistolik,tdDiastolik,nadi,rr,suhu,spo2", title: "TTV Awal Pasca Pulang" },
      { category: "DAILY_COMPLAINT", subType: "harian", title: "Keluhan Harian Hari 1" },
      { category: "SKRINING", subType: "INFECTIOUS", title: "Skrining Penyakit Menular" },
      { category: "SKRINING", subType: "FALL_RISK", title: "Skrining Risiko Jatuh" },
    ],
  },
  {
    key: "PASCA_7",
    label: "Pasca Haji Hari 7",
    condition: "7 hari setelah tiba",
    forms: [
      { category: "TTV", subType: "tdSistolik,tdDiastolik,suhu,spo2,gulaDarah", title: "TTV Hari 7" },
      { category: "DAILY_COMPLAINT", subType: "harian", title: "Keluhan Harian Hari 7" },
      { category: "SKRINING", subType: "INFECTIOUS", title: "Monitoring Gejala Infeksi" },
      { category: "SKRINING", subType: "MENTAL", title: "Skrining Kesehatan Mental" },
      { category: "SKRINING", subType: "SPIRITUAL", title: "Skrining Spiritual" },
    ],
  },
  {
    key: "PASCA_14",
    label: "Pasca Haji Hari 14",
    condition: "14 hari setelah tiba",
    forms: [
      { category: "TTV", subType: "tdSistolik,tdDiastolik,beratBadan,gulaDarah", title: "TTV Hari 14" },
      { category: "CHRONIC", subType: "DIABETES", title: "Monitoring Gula Darah" },
      { category: "SKRINING", subType: "NUTRITION", title: "Skrining Nutrisi" },
      { category: "SKRINING", subType: "ACTIVITY", title: "Skrining Aktivitas Fisik" },
    ],
  },
  {
    key: "PASCA_30",
    label: "Pasca Haji Hari 30",
    condition: "30 hari setelah tiba",
    forms: [
      { category: "TTV", subType: "tdSistolik,tdDiastolik,nadi,rr,suhu,spo2,beratBadan,gulaDarah", title: "Evaluasi TTV Komprehensif" },
      { category: "SKRINING", subType: "INFECTIOUS", title: "Evaluasi Penyakit Menular" },
      { category: "SKRINING", subType: "MENTAL", title: "Evaluasi Kesehatan Mental" },
      { category: "SKRINING", subType: "FRAILTY", title: "Evaluasi Frailty" },
      { category: "SKRINING", subType: "FOLLOWUP", title: "Kebutuhan Tindak Lanjut" },
    ],
  },
];

// ===== API CONTRACT (backend harus implementasi) =====
//
// GET  /api/telemedicine/rooms                    → { rooms: (ChatRoomData & { jamaah, lastMessage, online })[] }
// GET  /api/telemedicine/rooms/[jamaahId]         → { room, messages: ChatMessageData[], requests: TelemedicineRequestData[] }
//    (auto-create room if not exists)
// POST /api/telemedicine/rooms/[jamaahId]/message → { type, content, attachmentUrl?, attachmentName? } → { message }
// POST /api/telemedicine/rooms/[jamaahId]/request → { category, subType, title, fields, hariKe? } → { request, message }
//    (creates request + chat message TTV_REQUEST/SKRINING_REQUEST/etc.)
// POST /api/telemedicine/request/[requestId]/submit → { response, skor? } → { request, alerts, newMessages }
//    (marks submitted, writes to VitalSign/PreHajjVital/Screening/PreHajjScreening, creates TTV_RESULT/SKRINING_RESULT message, runs alert rules, creates AI ALERT messages)
// POST /api/telemedicine/rooms/[jamaahId]/template → { templateId } → { message }
// GET  /api/telemedicine/templates                → { templates }
// POST /api/telemedicine/rooms/[jamaahId]/ai-summary → { summary: TelemedicineAiSummaryData } (LLM reads chat + clinical data)
// POST /api/telemedicine/rooms/[jamaahId]/smart-monitoring → { phase } → { sentCount, requestIds[] } (auto-sends forms per phase)
// POST /api/telemedicine/rooms/[jamaahId]/read    → marks doctor read all → { ok }
// GET  /api/telemedicine/dashboard                → { unread, pendingForms, highRisk, online, followUp }

// ===== SOCKET.IO EVENTS (mini-service port 3003) =====
//
// Client → Server:
//   'telemedicine:join'    { jamaahId }           — join room for jamaah
//   'telemedicine:leave'   { jamaahId }
//   'telemedicine:typing'  { jamaahId, isTyping }
//   'telemedicine:presence'{ jamaahId, role }     — announce online (DOCTOR | JAMAAH)
//
// Server → Client:
//   'telemedicine:message'     { message: ChatMessageData }      — new message
//   'telemedicine:typing'      { jamaahId, isTyping, role }
//   'telemedicine:presence'    { jamaahId, online: { doctor, jamaah } }
//   'telemedicine:alert'       { jamaahId, alert: { level, detail } }
//   'telemedicine:request'     { jamaahId, request }             — new form request
//   'telemedicine:response'    { jamaahId, request }             — form submitted
