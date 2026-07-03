"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import type { JamaahData } from "@/lib/types";

export function QrIdentitas({ jamaah }: { jamaah: JamaahData }) {
  // Payload QR: data identitas penting
  const payload = JSON.stringify({
    n: jamaah.nik,
    p: jamaah.porsi,
    k: jamaah.kloter,
    nm: jamaah.nama,
    gd: jamaah.golDarah ?? "-",
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-2 p-4">
        <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-border/50">
          <QRCodeSVG value={payload} size={128} level="M" includeMargin={false} fgColor="#0f766e" />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-foreground">QR Identitas Jamaah</p>
          <p className="text-[10px] text-muted-foreground">Scan untuk verifikasi cepat</p>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">{jamaah.nik}</p>
      </CardContent>
    </Card>
  );
}
