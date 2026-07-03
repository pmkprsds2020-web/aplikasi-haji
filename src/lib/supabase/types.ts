// TypeScript types for the Supabase database schema.
// Mirrors the Prisma schema (prisma/schema.prisma) → Postgres tables in Supabase.
// Generate via `bunx supabase gen types` after running the SQL migration for full accuracy.

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type UserRole = "doctor" | "admin" | "jamaah";

export interface Database {
  public: {
    Tables: {
      // ===== Auth-linked profile =====
      profiles: {
        Row: {
          id: string; // references auth.users(id)
          role: UserRole;
          full_name: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };

      // ===== Jamaah (EHHR core) =====
      jamaah: {
        Row: {
          id: string;
          user_id: string | null; // optional link to auth.users
          nama: string;
          nik: string;
          kloter: string;
          porsi: string;
          usia: number;
          kelamin: string;
          alamat: string;
          hp: string;
          kontak_keluarga: string;
          tanggal_tiba: string;
          bandara: string;
          kabupaten_kota: string;
          puskesmas: string;
          dokter_keluarga: string;
          paspor: string | null;
          embarkasi: string | null;
          gol_darah: string | null;
          riwayat_penyakit: string | null;
          riwayat_operasi: string | null;
          alergi: string | null;
          obat_rutin: string | null;
          status_istithaah: string | null;
          tanggal_berangkat: string | null;
          tanggal_pulang: string | null;
          risk_level: string;
          risk_summary: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["jamaah"]["Row"], "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["jamaah"]["Insert"]>;
      };

      // ===== Pasca Haji =====
      screening: {
        Row: {
          id: string;
          jamaah_id: string;
          jenis: string;
          data: string; // JSON
          skor: string | null;
          catatan: string | null;
          hari_ke: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["screening"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["screening"]["Insert"]>;
      };

      vital_sign: {
        Row: {
          id: string;
          jamaah_id: string;
          td_sistolik: number | null;
          td_diastolik: number | null;
          nadi: number | null;
          rr: number | null;
          suhu: number | null;
          spo2: number | null;
          berat_badan: number | null;
          gula_darah: number | null;
          hari_ke: number;
          catatan: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vital_sign"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vital_sign"]["Insert"]>;
      };

      // ===== Pra Haji =====
      pre_hajj_vital: {
        Row: {
          id: string;
          jamaah_id: string;
          td_sistolik: number | null;
          td_diastolik: number | null;
          nadi: number | null;
          rr: number | null;
          suhu: number | null;
          spo2: number | null;
          berat_badan: number | null;
          tinggi_badan: number | null;
          lingkar_perut: number | null;
          catatan: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_vital"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_vital"]["Insert"]>;
      };

      pre_hajj_lab: {
        Row: {
          id: string;
          jamaah_id: string;
          hb: number | null;
          gdp: number | null;
          gd2pp: number | null;
          hba1c: number | null;
          kolesterol: number | null;
          hdl: number | null;
          ldl: number | null;
          trigliserida: number | null;
          asam_urat: number | null;
          sgot: number | null;
          sgpt: number | null;
          kreatinin: number | null;
          egfr: number | null;
          urinalisis: string | null;
          catatan: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_lab"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_lab"]["Insert"]>;
      };

      pre_hajj_chronic: {
        Row: {
          id: string;
          jamaah_id: string;
          hipertensi: string;
          diabetes: string;
          ppok: string;
          ckd: string;
          jantung: string;
          stroke: string;
          kanker: string;
          obat_rutin: string | null;
          target_terapi: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_chronic"]["Row"], "id" | "updated_at"> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_chronic"]["Insert"]>;
      };

      pre_hajj_screening: {
        Row: {
          id: string;
          jamaah_id: string;
          jenis: string;
          data: string;
          skor: string | null;
          catatan: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_screening"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_screening"]["Insert"]>;
      };

      pre_hajj_medication: {
        Row: {
          id: string;
          jamaah_id: string;
          nama_obat: string;
          dosis: string | null;
          frekuensi: string | null;
          indikasi: string | null;
          catatan: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_medication"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_medication"]["Insert"]>;
      };

      pre_hajj_immunization: {
        Row: {
          id: string;
          jamaah_id: string;
          jenis: string;
          tanggal_vaksin: string | null;
          nomor_batch: string | null;
          catatan: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_immunization"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_immunization"]["Insert"]>;
      };

      pre_hajj_fitness: {
        Row: {
          id: string;
          jamaah_id: string;
          target_langkah: number | null;
          jalan_kaki: number | null;
          aerobik: number | null;
          kekuatan: number | null;
          pernafasan: number | null;
          catatan: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_fitness"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_fitness"]["Insert"]>;
      };

      pre_hajj_education: {
        Row: {
          id: string;
          jamaah_id: string;
          diet: boolean;
          aktivitas: boolean;
          obat: boolean;
          hidrasi: boolean;
          istirahat: boolean;
          manajemen_kronis: boolean;
          persiapan_perjalanan: boolean;
          catatan: string | null;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_education"]["Row"], "id" | "updated_at"> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_education"]["Insert"]>;
      };

      pre_hajj_ai_assessment: {
        Row: {
          id: string;
          jamaah_id: string;
          ringkasan: string;
          faktor_risiko: string;
          kesiapan_berangkat: string;
          rekomendasi: string;
          soap: string | null;
          resume_medis: string | null;
          surat_rujukan: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pre_hajj_ai_assessment"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pre_hajj_ai_assessment"]["Insert"]>;
      };

      // ===== Telemedicine =====
      chat_room: {
        Row: {
          id: string;
          jamaah_id: string;
          doctor_id: string;
          last_message_at: string;
          unread_by_doctor: number;
          unread_by_jamaah: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chat_room"]["Row"], "id" | "created_at" | "last_message_at"> & {
          id?: string;
          created_at?: string;
          last_message_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_room"]["Insert"]>;
      };

      chat_message: {
        Row: {
          id: string;
          room_id: string;
          sender_type: string;
          sender_name: string | null;
          type: string;
          content: string;
          attachment_url: string | null;
          attachment_name: string | null;
          request_id: string | null;
          read_by_doctor: boolean;
          read_by_jamaah: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["chat_message"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_message"]["Insert"]>;
      };

      telemedicine_request: {
        Row: {
          id: string;
          room_id: string;
          jamaah_id: string;
          category: string;
          sub_type: string | null;
          title: string;
          fields: string;
          status: string;
          scheduled_for: string | null;
          submitted_at: string | null;
          response: string | null;
          skor: string | null;
          hari_ke: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["telemedicine_request"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["telemedicine_request"]["Insert"]>;
      };

      telemedicine_template: {
        Row: {
          id: string;
          title: string;
          category: string;
          content: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["telemedicine_template"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["telemedicine_template"]["Insert"]>;
      };

      telemedicine_schedule: {
        Row: {
          id: string;
          jamaah_id: string;
          category: string;
          sub_type: string | null;
          title: string;
          hari_ke: number | null;
          time_of_day: string | null;
          active: boolean;
          last_sent_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["telemedicine_schedule"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["telemedicine_schedule"]["Insert"]>;
      };

      telemedicine_ai_summary: {
        Row: {
          id: string;
          jamaah_id: string;
          room_id: string;
          ringkasan: string;
          soap: string | null;
          assessment: string | null;
          plan: string | null;
          prioritas: string | null;
          rekomendasi: string | null;
          alerts: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["telemedicine_ai_summary"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["telemedicine_ai_summary"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "doctor" | "admin" | "jamaah";
    };
  };
}

export type Db = Database;
