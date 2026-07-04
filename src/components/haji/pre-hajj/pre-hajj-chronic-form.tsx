"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { PreHajjChronicData } from "@/lib/pre-hajj-types";

interface Props {
  jamaahId: string;
  chronic: PreHajjChronicData | null;
  onSaved: () => void;
}

const CHRONIC_ITEMS: { key: keyof PreHajjChronicData; label: string }[] = [
  { key: "hipertensi", label: "Hipertensi" },
  { key: "diabetes", label: "Diabetes Mellitus" },
  { key: "ppok", label: "PPOK" },
  { key: "ckd", label: "Penyakit Ginjal Kronis (CKD)" },
  { key: "jantung", label: "Penyakit Jantung" },
  { key: "stroke", label: "Stroke" },
  { key: "kanker", label: "Kanker" },
];

const STATUS_OPTS = ["Tidak", "Terkontrol", "Tidak Terkontrol"];

export function PreHajjChronicForm({ jamaahId, chronic, onSaved }: Props) {
  const [vals, setVals] = React.useState<Record<string, string>>({});
  const [obatRutin, setObatRutin] = React.useState("");
  const [targetTerapi, setTargetTerapi] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (chronic) {
      const next: Record<string, string> = {};
      for (const it of CHRONIC_ITEMS) {
        next[it.key] = (chronic[it.key] as string) ?? "Tidak";
      }
      setVals(next);
      setObatRutin(chronic.obatRutin ?? "");
      setTargetTerapi(chronic.targetTerapi ?? "");
    } else {
      const next: Record<string, string> = {};
      for (const it of CHRONIC_ITEMS) next[it.key] = "Tidak";
      setVals(next);
      setObatRutin("");
      setTargetTerapi("");
    }
  }, [chronic]);

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        jamaah_id: jamaahId,
        hipertensi: vals.hipertensi ?? "Tidak",
        diabetes: vals.diabetes ?? "Tidak",
        ppok: vals.ppok ?? "Tidak",
        ckd: vals.ckd ?? "Tidak",
        jantung: vals.jantung ?? "Tidak",
        stroke: vals.stroke ?? "Tidak",
        kanker: vals.kanker ?? "Tidak",
        obat_rutin: obatRutin.trim() || null,
        target_terapi: targetTerapi.trim() || null,
      };
      console.log("Saving to Supabase...");
      console.log("Payload:", payload);
      const { data, error } = await supabase
        .from("pre_hajj_chronic")
        .upsert(payload, { onConflict: "jamaah_id" });
      console.log("Supabase Response:", data);
      console.log("Supabase Error:", error);
      if (error) {
        console.error("[PreHajjChronic] UPSERT failed:", error);
        toast.error(`Gagal menyimpan: ${error.message}`);
        return;
      }
      toast.success("Data penyakit kronis tersimpan");
      onSaved();
    } catch (err) {
      console.error("[PreHajjChronic] Exception:", err);
      toast.error(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  const ringkas = CHRONIC_ITEMS
    .map((it) => vals[it.key])
    .filter((v) => v && v !== "Tidak").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HeartPulse className="h-5 w-5" />
          </span>
          <div>
            <CardTitle className="text-base">Penyakit Kronis</CardTitle>
            <CardDescription className="text-xs">
              Status kontrol penyakit kronis jamaah · {ringkas} kondisi aktif
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {CHRONIC_ITEMS.map((it) => (
            <div key={it.key}>
              <Label className="mb-1 block text-xs font-medium text-muted-foreground">
                {it.label}
              </Label>
              <Select
                value={vals[it.key] ?? "Tidak"}
                onValueChange={(v) => setVals((s) => ({ ...s, [it.key]: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Obat Rutin</Label>
            <Input
              value={obatRutin}
              onChange={(e) => setObatRutin(e.target.value)}
              placeholder="mis. Amlodipin 10mg 1×1, Metformin 500mg 2×1"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Target Terapi</Label>
            <Input
              value={targetTerapi}
              onChange={(e) => setTargetTerapi(e.target.value)}
              placeholder="mis. TD < 140/90, HbA1c < 7%"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan Penyakit Kronis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
