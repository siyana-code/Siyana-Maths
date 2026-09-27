import type { Metadata } from "next";
import { Roboto } from "next/font/google";

import { SnackbarProvider } from "@/components/ui/Snackbar";

import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: {
    default: "Siyana Maths",
    template: "%s | Siyana Maths",
  },
  description: "O/L Mathematics past papers, Sinhala solutions, and marking schemes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body style={{ fontFamily: "var(--font-roboto), system-ui, sans-serif" }}>
        <SnackbarProvider>{children}</SnackbarProvider>
      </body>
    </html>
  );
}
