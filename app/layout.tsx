import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({ weight: ["400", "500", "700", "900"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Design Review Portal",
  description: "Secure, private 3D design reviews.",
};

export const dynamic = "force-dynamic";

import { getSettings } from "@/lib/settings-actions";
import Providers from "@/components/providers";
import Navbar from "@/components/navbar";
import { Toaster } from "sonner";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${roboto.className} min-h-screen bg-background text-foreground antialiased`}>
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-primary: ${settings.primaryColor};
            --color-secondary: ${settings.secondaryColor};
          }
        ` }} />
        <Providers>
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
