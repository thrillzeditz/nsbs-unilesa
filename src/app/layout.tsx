import type { Metadata, Viewport } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "NSBS University of Ilesa - Academic & Information Portal",
  description: "The official academic portal for the Nigerian Society of Biochemistry Students (NSBS), University of Ilesa Chapter. Access library resources, past questions, news announcements, and pay departmental dues.",
  keywords: ["NSBS", "University of Ilesa", "Biochemistry", "UNILESA", "Academic Portal", "Departmental Dues", "E-Voting"],
  authors: [{ name: "NSBS UILESA Chapter" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
