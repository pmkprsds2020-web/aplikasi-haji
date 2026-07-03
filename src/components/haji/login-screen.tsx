"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, HeartPulse, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { useSupabaseAuth } from "./supabase-auth-provider";
import { toast } from "sonner";

export function LoginScreen() {
  const { signIn, signUp } = useSupabaseAuth();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [role, setRole] = React.useState<"doctor" | "jamaah">("doctor");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email dan password wajib diisi");
      return;
    }
    if (mode === "signup" && !fullName) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Berhasil masuk");
        }
      } else {
        const { error } = await signUp(email, password, fullName, role);
        if (error) {
          toast.error(error);
        } else {
          toast.success(
            "Pendaftaran berhasil. Jika konfirmasi email diaktifkan, cek email Anda untuk verifikasi."
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <HeartPulse className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SiHaji Care</h1>
            <p className="text-sm text-muted-foreground">
              Electronic Hajj Health Record · Telemedicine Monitoring
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          {/* Tabs */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition ${
                mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <LogIn className="h-4 w-4" /> Masuk
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition ${
                mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <UserPlus className="h-4 w-4" /> Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Nama Lengkap
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="dr. Rina Kartika"
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dokter@puskesmas.id"
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "signup" && (
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Peran</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole("doctor")}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      role === "doctor"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" /> Dokter
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("jamaah")}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      role === "jamaah"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <HeartPulse className="h-4 w-4" /> Jamaah
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : mode === "signin" ? (
                <LogIn className="mr-2 h-4 w-4" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {mode === "signin" ? "Masuk" : "Daftar"}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-primary hover:underline"
                >
                  Daftar di sini
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-medium text-primary hover:underline"
                >
                  Masuk di sini
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Terhubung ke Supabase · Pendekatan Biopsikososial Spiritual Kedokteran Keluarga
        </p>
      </div>
    </div>
  );
}
