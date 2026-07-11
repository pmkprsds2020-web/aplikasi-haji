"use client";

import * as React from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, FileText, Image as ImageIcon, Download, Trash2, Pencil, Loader2,
  Search, Filter, X, Send, Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseAuth } from "@/contexts/supabase-auth-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatTanggal } from "@/lib/format";

// ============================================================================
// PemeriksaanPenunjangView — medical support examination records
// ============================================================================

const JENIS_PEMERIKSAAN = [
  "Laboratorium", "Hematologi", "Kimia Klinik", "Urinalisis",
  "Radiologi", "CT Scan", "MRI", "USG",
  "EKG", "Echocardiografi", "Spirometri", "GeneXpert",
  "Kultur", "Foto Luka", "Dokumen Medis", "Lainnya",
];

const FILTER_OPTIONS = ["Laboratorium", "Radiologi", "EKG", "USG", "PDF", "Gambar"];

interface ExamRow {
  id: string;
  jamaah_id: string;
  jenis_pemeriksaan: string;
  nama_pemeriksaan: string;
  tanggal: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  file_size: number | null;
  keterangan: string | null;
  dokter_id: string | null;
  dokter_nama: string | null;
  created_at: string;
}

interface Props {
  jamaahId: string;
  onSendToTelemedicine?: (fileUrl: string, fileName: string, keterangan: string) => void;
}

export function PemeriksaanPenunjangView({ jamaahId, onSendToTelemedicine }: Props) {
  const { isDoctor, user } = useSupabaseAuth();
  const [list, setList] = React.useState<ExamRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<string | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<ExamRow | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!jamaahId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("medical_examination")
        .select("*")
        .eq("jamaah_id", jamaahId)
        .order("tanggal", { ascending: false });
      if (error) {
        console.error("[Pemeriksaan] load error:", error.message);
        toast.error("Gagal memuat pemeriksaan penunjang");
        setList([]);
      } else {
        setList((data ?? []) as ExamRow[]);
        console.log("[Pemeriksaan] loaded:", data?.length ?? 0, "records");
      }
    } catch (e) {
      console.error("[Pemeriksaan] load exception:", e);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [jamaahId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    let r = list;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((e) =>
        e.nama_pemeriksaan?.toLowerCase().includes(q) ||
        e.jenis_pemeriksaan?.toLowerCase().includes(q) ||
        e.keterangan?.toLowerCase().includes(q)
      );
    }
    if (filter) {
      if (filter === "PDF") r = r.filter((e) => e.mime_type === "application/pdf");
      else if (filter === "Gambar") r = r.filter((e) => (e.mime_type ?? "").startsWith("image/"));
      else r = r.filter((e) => e.jenis_pemeriksaan === filter);
    }
    return r;
  }, [list, search, filter]);

  async function handleDelete(exam: ExamRow) {
    if (!confirm(`Hapus pemeriksaan "${exam.nama_pemeriksaan}"?`)) return;
    try {
      const supabase = createClient();
      // Delete file from storage
      if (exam.file_url) {
        const path = exam.file_url.split("/medical-support-files/")[1];
        if (path) {
          await supabase.storage.from("medical-support-files").remove([path]);
        }
      }
      // Delete record
      const { error } = await supabase.from("medical_examination").delete().eq("id", exam.id);
      if (error) {
        toast.error("Gagal menghapus", { description: error.message });
        return;
      }
      toast.success("Pemeriksaan dihapus");
      load();
    } catch (e) {
      toast.error("Gagal menghapus pemeriksaan");
    }
  }

  async function handleDownload(exam: ExamRow) {
    try {
      const supabase = createClient();
      const path = exam.file_url.split("/medical-support-files/")[1];
      if (!path) return;
      const { data, error } = await supabase.storage.from("medical-support-files").createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) {
        toast.error("Gagal membuat download URL");
        return;
      }
      window.open(data.signedUrl, "_blank");
    } catch (e) {
      toast.error("Gagal mengunduh file");
    }
  }

  async function handlePreview(exam: ExamRow) {
    try {
      const supabase = createClient();
      const path = exam.file_url.split("/medical-support-files/")[1];
      if (!path) return;
      const { data, error } = await supabase.storage.from("medical-support-files").createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) {
        toast.error("Gagal membuat preview URL");
        return;
      }
      setPreviewUrl(data.signedUrl);
    } catch (e) {
      toast.error("Gagal membuka preview");
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold">Pemeriksaan Penunjang</h3>
          <p className="text-sm text-muted-foreground">Hasil lab, radiologi, EKG, dan dokumen medis</p>
        </div>
        {isDoctor && (
          <Button size="sm" onClick={() => { setEditTarget(null); setAddOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Tambah Pemeriksaan
          </Button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, kategori, keterangan…" className="pl-9" />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          {FILTER_OPTIONS.map((f) => (
            <button key={f} onClick={() => setFilter(filter === f ? null : f)}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40")}>
              {f}
            </button>
          ))}
          {filter && <button onClick={() => setFilter(null)} className="text-xs text-primary hover:underline">Reset</button>}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium">Belum ada pemeriksaan penunjang</p>
            <p className="text-xs text-muted-foreground">
              {isDoctor ? "Klik \"Tambah Pemeriksaan\" untuk menambahkan hasil lab, radiologi, atau dokumen medis." : "Dokter belum menambahkan pemeriksaan penunjang."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((exam) => {
            const isPdf = exam.mime_type === "application/pdf";
            const isImage = (exam.mime_type ?? "").startsWith("image/");
            return (
              <Card key={exam.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* File icon */}
                    <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      isPdf ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
                            : isImage ? "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"
                            : "bg-muted text-muted-foreground")}>
                      {isPdf ? <FileText className="h-5 w-5" /> : isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                    </span>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{exam.nama_pemeriksaan}</p>
                        <Badge variant="secondary" className="text-xs">{exam.jenis_pemeriksaan}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatTanggal(exam.tanggal)} · {exam.file_name} · {exam.dokter_nama ?? "—"}
                      </p>
                      {exam.keterangan && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{exam.keterangan}</p>
                      )}
                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePreview(exam)}>
                          {isImage ? <ImageIcon className="mr-1 h-3.5 w-3.5" /> : <FileText className="mr-1 h-3.5 w-3.5" />}
                          Preview
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDownload(exam)}>
                          <Download className="mr-1 h-3.5 w-3.5" /> Download
                        </Button>
                        {isDoctor && onSendToTelemedicine && (
                          <Button variant="outline" size="sm" onClick={() => onSendToTelemedicine(exam.file_url, exam.file_name, exam.keterangan ?? "")}>
                            <Send className="mr-1 h-3.5 w-3.5" /> Kirim ke Telemedicine
                          </Button>
                        )}
                        {isDoctor && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => { setEditTarget(exam); setAddOpen(true); }}>
                              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(exam)}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <ExamFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        jamaahId={jamaahId}
        editTarget={editTarget}
        dokterId={user?.id ?? null}
        dokterNama={user?.email ?? "Dokter"}
        onSaved={load}
      />

      {/* Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={(v) => { if (!v) setPreviewUrl(null); }}>
        <DialogContent className="max-h-[95vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Preview File</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex h-[85vh] items-center justify-center bg-black/5">
              {previewUrl.includes(".pdf") || previewUrl.includes("application/pdf") ? (
                <iframe src={previewUrl} className="h-full w-full" title="PDF Preview" />
              ) : (
                <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// ExamFormDialog — Add/Edit examination with file upload
// ============================================================================

interface FormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jamaahId: string;
  editTarget: ExamRow | null;
  dokterId: string | null;
  dokterNama: string;
  onSaved: () => void;
}

function ExamFormDialog({ open, onOpenChange, jamaahId, editTarget, dokterId, dokterNama, onSaved }: FormProps) {
  const [jenis, setJenis] = React.useState("Laboratorium");
  const [nama, setNama] = React.useState("");
  const [tanggal, setTanggal] = React.useState(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      if (editTarget) {
        setJenis(editTarget.jenis_pemeriksaan);
        setNama(editTarget.nama_pemeriksaan);
        setTanggal(editTarget.tanggal);
        setKeterangan(editTarget.keterangan ?? "");
        setFile(null);
      } else {
        setJenis("Laboratorium");
        setNama("");
        setTanggal(new Date().toISOString().slice(0, 10));
        setKeterangan("");
        setFile(null);
      }
      setUploadProgress(0);
    }
  }, [open, editTarget]);

  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Format tidak didukung", { description: "Hanya JPG, PNG, WEBP, dan PDF" });
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("File terlalu besar", { description: "Maksimal 20 MB" });
      return;
    }
    setFile(f);
  }

  async function handleSave() {
    if (!nama.trim()) { toast.error("Nama pemeriksaan wajib diisi"); return; }
    if (!editTarget && !file) { toast.error("File wajib diunggah"); return; }

    setSaving(true);
    setUploadProgress(0);
    try {
      const supabase = createClient();
      let fileUrl = editTarget?.file_url ?? "";
      let fileName = editTarget?.file_name ?? "";
      let mimeType = editTarget?.mime_type ?? null;
      let fileSize = editTarget?.file_size ?? null;

      // Upload file if new file selected
      if (file) {
        const year = new Date().getFullYear();
        const ext = file.name.split(".").pop() ?? "bin";
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const path = `${jamaahId}/pemeriksaan/${year}/${safeName}`;

        console.log("[Pemeriksaan] Uploading to:", path);
        const { error: upErr } = await supabase.storage
          .from("medical-support-files")
          .upload(path, file, { upsert: false });

        if (upErr) {
          console.error("[Pemeriksaan] upload error:", upErr.message);
          toast.error("Gagal mengunggah file", { description: upErr.message });
          setSaving(false);
          return;
        }

        const { data: pubData } = supabase.storage.from("medical-support-files").getPublicUrl(path);
        fileUrl = pubData.publicUrl;
        fileName = file.name;
        mimeType = file.type;
        fileSize = file.size;
        setUploadProgress(100);
        console.log("[Pemeriksaan] upload success:", fileUrl);
      }

      // Insert or update record
      const payload = {
        jamaah_id: jamaahId,
        jenis_pemeriksaan: jenis,
        nama_pemeriksaan: nama.trim(),
        tanggal: tanggal,
        file_name: fileName,
        file_url: fileUrl,
        mime_type: mimeType,
        file_size: fileSize,
        keterangan: keterangan.trim() || null,
        dokter_id: dokterId,
        dokter_nama: dokterNama,
        updated_at: new Date().toISOString(),
      };

      if (editTarget) {
        const { error } = await supabase.from("medical_examination").update(payload).eq("id", editTarget.id);
        if (error) { toast.error("Gagal menyimpan", { description: error.message }); setSaving(false); return; }
        toast.success("Pemeriksaan diperbarui");
      } else {
        const { error } = await supabase.from("medical_examination").insert(payload);
        if (error) { toast.error("Gagal menyimpan", { description: error.message }); setSaving(false); return; }
        toast.success("Pemeriksaan ditambahkan");
      }

      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error("[Pemeriksaan] save exception:", e);
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Edit Pemeriksaan" : "Tambah Pemeriksaan Penunjang"}</DialogTitle>
          <DialogDescription>Unggah hasil lab, radiologi, EKG, atau dokumen medis</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Jenis */}
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Jenis Pemeriksaan</Label>
            <Select value={jenis} onValueChange={setJenis}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {JENIS_PEMERIKSAAN.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Nama */}
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Nama Pemeriksaan *</Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="HbA1c, Foto Thoraks, EKG…" />
          </div>
          {/* Tanggal */}
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Tanggal Pemeriksaan</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          {/* File */}
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Upload File {!editTarget && "*"}</Label>
            <div className="flex items-center gap-2">
              <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileSelect} className="hidden" id="exam-file-input" />
              <Button variant="outline" size="sm" onClick={() => document.getElementById("exam-file-input")?.click()} disabled={saving}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Pilih File
              </Button>
              {file && <span className="text-xs text-muted-foreground truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>}
              {editTarget && !file && <span className="text-xs text-muted-foreground">File saat ini: {editTarget.file_name}</span>}
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted-foreground">JPG, PNG, WEBP, PDF · Maks 20 MB</p>
          </div>
          {/* Keterangan */}
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Keterangan</Label>
            <Textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={4} maxLength={5000} placeholder="Hasil pemeriksaan, interpretasi, rekomendasi…" />
            <p className="mt-0.5 text-[10px] text-muted-foreground">{keterangan.length}/5000</p>
          </div>
          {/* Dokter (read-only) */}
          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">Dokter</Label>
            <Input value={dokterNama} disabled className="bg-muted/50" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan…</> : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
