"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, GraduationCap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { PreHajjEducationData } from "@/lib/pre-hajj-types";

interface Props {
  jamaahId: string;
  education: PreHajjEducationData | null;
  onSaved: () => void;
}

const ITEMS: { key: keyof PreHajjEducationData; label: string; desc: string }[] = [
  { key: "diet", label: "Diet & Nutrisi", desc: "Pola makan sehat, hindari dehidrasi" },
  { key: "aktivitas", label: "Aktivitas Fisik", desc: "Latihan fisik bertahap" },
  { key: "obat", label: "Manajemen Obat", desc: "Kepatuhan & penyimpanan obat" },
  { key: "hidrasi", label: "Hidrasi", desc: "Asupan cairan yang cukup" },
  { key: "istirahat", label: "Istirahat & Tidur", desc: "Manajemen jet-lag & kelelahan" },
  { key: "manajemenKronis", label: "Manajemen Penyakit Kronis", desc: "Kontrol hipertensi, DM, dll" },
  { key: "persiapanPerjalanan", label: "Persiapan Perjalanan", desc: "Dokumen, koper, obat darurat" },
];

export function PreHajjEducationForm({ jamaahId, education, onSaved }: Props) {
  const [vals, setVals] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const it of ITEMS) next[it.key] = education ? Boolean(education[it.key]) : false;
    setVals(next);
  }, [education]);

  const done = ITEMS.filter((it) => vals[it.key]).length;

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        jamaah_id: jamaahId,
        diet: !!vals.diet,
        aktivitas: !!vals.aktivitas,
        obat: !!vals.obat,
        hidrasi: !!vals.hidrasi,
        istirahat: !!vals.istirahat,
        manajemen_kronis: !!vals.manajemenKronis,
        persiapan_perjalanan: !!vals.persiapanPerjalanan,
        catatan: null,
      };
      console.log("Saving to Supabase...");
      console.log("Payload:", payload);
      const { data, error } = await supabase
        .from("pre_hajj_education")
        .upsert(payload, { onConflict: "jamaah_id" });
      console.log("Supabase Response:", data);
      console.log("Supabase Error:", error);
      if (error) {
        console.error("[PreHajjEducation] UPSERT failed:", error);
        toast.error(`Gagal menyimpan: ${error.message}`);
        return;
      }
      toast.success(`Edukasi tersimpan — ${done}/7 selesai`);
      onSaved();
    } catch (err) {
      console.error("[PreHajjEducation] Exception:", err);
      toast.error(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <CardTitle className="text-base">Edukasi Pra Keberangkatan</CardTitle>
            <CardDescription className="text-xs">
              {done === 7 ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Semua topik edukasi selesai
                </span>
              ) : (
                `${done}/7 topik selesai`
              )}
            </CardDescription>
          </div>
        </div>
        <div className="mt-2">
          <Progress value={(done / ITEMS.length) * 100} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {ITEMS.map((it) => (
            <label
              key={it.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5 transition hover:border-primary/40 hover:bg-accent/40"
            >
              <Checkbox
                checked={!!vals[it.key]}
                onCheckedChange={(v) => setVals((s) => ({ ...s, [it.key]: !!v }))}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">{it.label}</span>
                <span className="block text-xs text-muted-foreground">{it.desc}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Edukasi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
