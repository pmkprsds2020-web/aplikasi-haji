"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Activity, Pill, GraduationCap, CalendarClock,
  CheckCircle2, Clock, Loader2, FileText, ChevronRight,
} from "lucide-react";

// ============================================================================
// InteractiveFormCard — renders request-type chat messages as interactive cards.
// Instead of showing "Barthel Index" as plain text, this card shows:
//   - Form title + icon
//   - Status: Menunggu Pengisian / Selesai
//   - Button: "Isi Form" (when waiting) or "Lihat Hasil" (when completed)
// ============================================================================

interface TelemedicineRequestRow {
  id: string;
  room_id: string;
  jamaah_id: string;
  category: string;
  sub_type: string | null;
  title: string;
  fields: string;
  status: string; // PENDING | SUBMITTED
  response: string | null;
  skor: string | null;
  submitted_at: string | null;
  created_at: string;
}

interface Props {
  messageId: string;
  requestId: string | null;
  messageType: string;
  content: string;
  senderType: string;
  createdAt: string;
  isJamaah: boolean; // true = jamaah viewing, false = dokter viewing
  onFormSubmitted?: () => void; // callback to refresh messages
}

const TYPE_CONFIG: Record<string, { icon: typeof ClipboardList; label: string; color: string }> = {
  TTV_REQUEST: { icon: Activity, label: "Tanda Tanda Vital", color: "text-emerald-600" },
  SKRINING_REQUEST: { icon: ClipboardList, label: "Form Skrining", color: "text-violet-600" },
  EDUKASI: { icon: GraduationCap, label: "Edukasi", color: "text-sky-600" },
  OBAT: { icon: Pill, label: "Instruksi Obat", color: "text-amber-600" },
  MONITORING: { icon: CalendarClock, label: "Monitoring", color: "text-rose-600" },
  TTV_RESULT: { icon: Activity, label: "Hasil TTV", color: "text-emerald-600" },
  SKRINING_RESULT: { icon: ClipboardList, label: "Hasil Skrining", color: "text-violet-600" },
};

export function InteractiveFormCard({
  messageId, requestId, messageType, content, senderType, createdAt, isJamaah, onFormSubmitted,
}: Props) {
  const [request, setRequest] = React.useState<TelemedicineRequestRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState<Record<string, string>>({});

  const config = TYPE_CONFIG[messageType] ?? TYPE_CONFIG.SKRINING_REQUEST;
  const Icon = config.icon;
  const time = new Date(createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  // ===== Fetch the telemedicine_request =====
  React.useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    async function fetchRequest() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("telemedicine_request")
          .select("*")
          .eq("id", requestId)
          .maybeSingle();
        if (error) {
          console.error("[InteractiveFormCard] fetch error:", error.message);
        }
        console.log("[InteractiveFormCard] request:", data, "| requestId:", requestId, "| status:", (data as Record<string, unknown>)?.status);
        setRequest(data as TelemedicineRequestRow | null);
      } catch (e) {
        console.error("[InteractiveFormCard] exception:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchRequest();
  }, [requestId]);

  // ===== Parse form fields from request =====
  const fields: Array<{ key: string; label: string; type: string; unit?: string; options?: Array<{ value: string; label: string }>; required?: boolean; placeholder?: string }> = React.useMemo(() => {
    if (!request?.fields) return [];
    try {
      const parsed = JSON.parse(request.fields);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* */ }
    return [];
  }, [request]);

  const isCompleted = request?.status === "SUBMITTED";
  const isWaiting = !isCompleted;

  // ===== Handle form submit =====
  async function handleSubmit() {
    if (!request) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      console.log("[InteractiveFormCard] Submitting form. requestId:", request.id, "| data:", formData);

      // Update telemedicine_request: status → SUBMITTED, response → JSON, skor
      const { error: updateErr } = await supabase
        .from("telemedicine_request")
        .update({
          status: "SUBMITTED",
          submitted_at: new Date().toISOString(),
          response: JSON.stringify(formData),
          skor: formData.skor ?? formData.score ?? null,
        })
        .eq("id", request.id);

      if (updateErr) {
        console.error("[InteractiveFormCard] submit error:", updateErr.message);
        toast.error("Gagal mengirim form", { description: updateErr.message });
        return;
      }

      console.log("[InteractiveFormCard] Form submitted successfully!");
      toast.success("Form berhasil dikirim ke dokter");

      // Update local state
      setRequest({ ...request, status: "SUBMITTED", submitted_at: new Date().toISOString(), response: JSON.stringify(formData) });
      setShowForm(false);
      onFormSubmitted?.();
    } catch (e) {
      console.error("[InteractiveFormCard] submit exception:", e);
      toast.error("Gagal mengirim form");
    } finally {
      setSubmitting(false);
    }
  }

  // ===== Loading state =====
  if (loading) {
    return (
      <div className={cn("flex", isJamaah ? "justify-start" : "justify-start")}>
        <Card className="max-w-[85%] w-72">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Memuat form...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== No request found — fallback to text bubble =====
  if (!request) {
    return (
      <div className={cn("flex", isJamaah ? "justify-start" : "justify-start")}>
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 shadow-sm">
          <p className="text-sm">{content}</p>
          <span className="mt-1 block text-xs text-muted-foreground">{time}</span>
        </div>
      </div>
    );
  }

  // ===== Parse response if completed =====
  const responseData: Record<string, string> | null = (() => {
    if (!request.response) return null;
    try {
      const p = JSON.parse(request.response);
      return p && typeof p === "object" ? p : null;
    } catch { return null; }
  })();

  return (
    <div className={cn("flex", isJamaah ? "justify-start" : "justify-start")}>
      <Card className="max-w-[85%] w-72 sm:w-80">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10", config.color)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-sm">{request.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Selesai
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <Clock className="mr-1 h-3 w-3" /> Menunggu Pengisian
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{time}</span>
          </div>

          {/* Form fields — only show when form is open and jamaah is viewing */}
          {showForm && isJamaah && isWaiting && fields.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border bg-accent/20 p-3">
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {field.label}{field.required ? " *" : ""}
                  </label>
                  {field.type === "yesno" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={formData[field.key] === "ya" ? "default" : "outline"}
                        onClick={() => setFormData((d) => ({ ...d, [field.key]: "ya" }))}
                        className="h-7 text-xs"
                      >Ya</Button>
                      <Button
                        size="sm"
                        variant={formData[field.key] === "tidak" ? "default" : "outline"}
                        onClick={() => setFormData((d) => ({ ...d, [field.key]: "tidak" }))}
                        className="h-7 text-xs"
                      >Tidak</Button>
                    </div>
                  ) : field.type === "textarea" ? (
                    <textarea
                      className="h-16 w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:border-primary"
                      value={formData[field.key] ?? ""}
                      onChange={(e) => setFormData((d) => ({ ...d, [field.key]: e.target.value }))}
                      placeholder={field.placeholder ?? ""}
                    />
                  ) : field.options && field.options.length > 0 ? (
                    <select
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-primary"
                      value={formData[field.key] ?? ""}
                      onChange={(e) => setFormData((d) => ({ ...d, [field.key]: e.target.value }))}
                    >
                      <option value="">Pilih...</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-primary"
                      value={formData[field.key] ?? ""}
                      onChange={(e) => setFormData((d) => ({ ...d, [field.key]: e.target.value }))}
                      placeholder={field.placeholder ?? (field.unit ? `0 ${field.unit}` : "")}
                    />
                  )}
                  {field.unit && field.type === "number" && (
                    <span className="ml-1 text-xs text-muted-foreground">{field.unit}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Response data — show when completed */}
          {isCompleted && responseData && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
              <p className="mb-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Hasil:</p>
              <div className="space-y-1">
                {Object.entries(responseData).slice(0, 6).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{String(val)}</span>
                  </div>
                ))}
              </div>
              {request.skor && (
                <div className="mt-2 flex items-center gap-2 border-t border-emerald-200 pt-2 dark:border-emerald-900">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Skor:</span>
                  <Badge variant="secondary" className="text-xs">{request.skor}</Badge>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          {isJamaah && isWaiting && (
            !showForm ? (
              <Button size="sm" className="w-full" onClick={() => setShowForm(true)}>
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Isi Form
              </Button>
            ) : (
              <Button size="sm" className="w-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Mengirim...</>
                ) : (
                  <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Kirim Hasil ke Dokter</>
                )}
              </Button>
            )
          )}

          {/* Doctor view: just show status */}
          {!isJamaah && isCompleted && (
            <div className="text-xs text-muted-foreground">
              Diisi pada: {request.submitted_at ? new Date(request.submitted_at).toLocaleString("id-ID") : "—"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
