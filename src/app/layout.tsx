import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SiHaji Care — Electronic Hajj Health Record",
  description: "Electronic Hajj Health Record (EHHR) — satu rekam kesehatan jamaah haji dari Pra Haji hingga Pasca Haji. Pendekatan biopsikososial spiritual kedokteran keluarga: deteksi dini penyakit menular, kontrol penyakit kronis, frailty lansia, kesehatan mental, spiritual & dukungan keluarga.",
  keywords: ["jamaah haji", "monitoring pasca haji", "kedokteran keluarga", "biopsikososial spiritual", "skrining kesehatan", "frailty", "PHQ-9", "GAD-7"],
  authors: [{ name: "SiHaji Care" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <SonnerToaster richColors position="top-center" />
        <Toaster />
      </body>
    </html>
  );
}
