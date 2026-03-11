import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({ weight: ["400", "500", "700", "900"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Design Review Portal",
  description: "Secure, private 3D design reviews.",
};

export const dynamic = "force-dynamic";

import Providers from "@/components/providers";
import Navbar from "@/components/navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${roboto.className} min-h-screen bg-background text-foreground antialiased`}>
        <Providers>
          <Navbar />
          <main className="pt-16">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
