"use client";

import * as React from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, GraduationCap, Pill, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ensureRoom, sendChatMessage } from "@/lib/supabase/telemedicine";

// =================== Edukasi ===================
const EDUKASI_TOPICS = [
  { value: "diet", label: "Diet & Gizi" },
  { value: "aktivitas", label: "Aktivitas Fisik" },
  { value: "obat", label: "Kepatuhan Obat" },
  { value: "hidrasi", label: "Hidrasi" },
  { value: "istirahat", label: "Istirahat & Tidur" },
  { value: "manajemenKronis", label: "Manajemen Penyakit Kronis" },
  { value: "persiapanPerjalanan", label: "Persiapan Perjalanan" },
];

interface EdukasiProps {
  jamaahId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}
export function EdukasiFormDialog({ jamaahId, open, onOpenChange, onSent }: EdukasiProps) {
  const [topic, setTopic] = React.useState("diet");
  const [pesan, setPesan] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) { setTopic("diet"); setPesan(""); }
  }, [open]);

  async function handleSend() {
    setSending(true);
    try {
      // ===== 1. Ensure room exists =====
      const { room, error: roomErr } = await ensureRoom(jamaahId, "doctor");
      if (roomErr || !room) {
        throw new Error(roomErr || "Gagal membuat room telemedicine");
      }

      const title = `Edukasi: ${EDUKASI_TOPICS.find((t) => t.value === topic)?.label ?? topic}`;

      // ===== 2. Insert telemedicine_request =====
      const supabase = createClient();
      const { data: newReq, error: reqErr } = await supabase
        .from("telemedicine_request")
        .insert({
          room_id: room.id,
          jamaah_id: jamaahId,
          category: "EDUKASI",
          sub_type: topic,
          title,
          fields: JSON.stringify([]),
          status: "PENDING",
        })
        .select("*")
        .single();
      if (reqErr) throw new Error(`[${reqErr.code}] ${reqErr.message}`);

      // ===== 3. Send EDUKASI chat message (linked to request) =====
      const { error: msgErr } = await sendChatMessage(room.id, {
        senderType: "DOCTOR",
        type: "EDUKASI",
        content: title,
        requestId: newReq.id,
      });
      if (msgErr) throw new Error(msgErr);

      // ===== 4. If doctor added a custom message, also send as TEXT =====
      if (pesan.trim()) {
        const { error: textErr } = await sendChatMessage(room.id, {
          senderType: "DOCTOR",
          type: "TEXT",
          content: pesan.trim(),
        });
        if (textErr) throw new Error(textErr);
      }
      toast.success("Edukasi terkirim");
      onSent();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Kirim Edukasi</DialogTitle>
              <DialogDescription>Pilih topik & tulis pesan edukasi</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Topik Edukasi</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EDUKASI_TOPICS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Pesan Edukasi (opsional)</Label>
            <Textarea value={pesan} onChange={(e) => setPesan(e.target.value)} rows={4} placeholder="Tuliskan pesan edukasi singkat untuk pasien…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Kirim Edukasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== Obat ===================
type ObatProps = EdukasiProps;
export function ObatFormDialog({ jamaahId, open, onOpenChange, onSent }: ObatProps) {
  const [pesan, setPesan] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) setPesan("");
  }, [open]);

  async function handleSend() {
    if (!pesan.trim()) {
      toast.error("Tuliskan instruksi obat");
      return;
    }
    setSending(true);
    try {
      // ===== 1. Ensure room exists =====
      const { room, error: roomErr } = await ensureRoom(jamaahId, "doctor");
      if (roomErr || !room) {
        throw new Error(roomErr || "Gagal membuat room telemedicine");
      }

      // ===== 2. Insert telemedicine_request =====
      const supabase = createClient();
      const { data: newReq, error: reqErr } = await supabase
        .from("telemedicine_request")
        .insert({
          room_id: room.id,
          jamaah_id: jamaahId,
          category: "OBAT",
          sub_type: "OBAT",
          title: "Instruksi Pengobatan",
          fields: JSON.stringify([]),
          status: "PENDING",
        })
        .select("*")
        .single();
      if (reqErr) throw new Error(`[${reqErr.code}] ${reqErr.message}`);

      // ===== 3. Send OBAT chat message with the actual instruction =====
      const { error: msgErr } = await sendChatMessage(room.id, {
        senderType: "DOCTOR",
        type: "OBAT",
        content: pesan.trim(),
        requestId: newReq.id,
      });
      if (msgErr) throw new Error(msgErr);

      toast.success("Instruksi obat terkirim");
      onSent();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <Pill className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Kirim Instruksi Obat</DialogTitle>
              <DialogDescription>Tuliskan resep / instruksi pengobatan</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Instruksi Obat</Label>
            <Textarea value={pesan} onChange={(e) => setPesan(e.target.value)} rows={5} placeholder="Contoh: Amlodipine 5mg 1×1 pagi. Metformin 500mg 2×1 setelah makan…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Kirim Instruksi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =================== Kirim File (placeholder message) ===================
type FileProps = EdukasiProps;
const FILE_TYPES = [
  { value: "IMAGE", label: "Foto" },
  { value: "PDF", label: "PDF" },
  { value: "FILE", label: "File" },
  { value: "LOCATION", label: "Lokasi" },
  { value: "STICKER", label: "Sticker" },
];

export function FileSendDialog({ jamaahId, open, onOpenChange, onSent }: FileProps) {
  const [fileType, setFileType] = React.useState("IMAGE");
  const [caption, setCaption] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) { setFileType("IMAGE"); setCaption(""); }
  }, [open]);

  async function handleSend() {
    setSending(true);
    try {
      // ===== 1. Ensure room exists =====
      const { room, error: roomErr } = await ensureRoom(jamaahId, "doctor");
      if (roomErr || !room) {
        throw new Error(roomErr || "Gagal membuat room telemedicine");
      }

      // ===== 2. Send attachment placeholder message =====
      const { error: msgErr } = await sendChatMessage(room.id, {
        senderType: "DOCTOR",
        type: fileType,
        content: caption.trim() || `[${FILE_TYPES.find((f) => f.value === fileType)?.label}]`,
        attachmentName: `placeholder-${fileType.toLowerCase()}.bin`,
      });
      if (msgErr) throw new Error(msgErr);

      toast.success(`${FILE_TYPES.find((f) => f.value === fileType)?.label} terkirim`);
      onSent();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengirim");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-300">
              <Paperclip className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg">Kirim Lampiran</DialogTitle>
              <DialogDescription>Pilih jenis & caption (simulasi)</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Jenis Lampiran</Label>
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FILE_TYPES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-muted-foreground">Caption / Pesan</Label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="Caption singkat…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Kirim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
