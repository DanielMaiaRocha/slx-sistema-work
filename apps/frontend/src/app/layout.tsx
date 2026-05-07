import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { TenantProvider } from "@/context/TenantContext";
import { BrandingProvider } from "@/components/BrandingProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "SLX Imobiliária | Gestão Financeira",
  description: "Sistema completo de gestão para imobiliárias - SaaS Multi-tenant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`}>
      <body className={outfit.className}>
        <Toaster position="top-right" toastOptions={{ style: { background: '#0F172A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
        <BrandingProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
