import type { Metadata } from "next";
import "@/app/globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DispatchFlow Portal",
  description: "Dispatch onboarding, portal chat, documents, invoices, payments and loads."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
