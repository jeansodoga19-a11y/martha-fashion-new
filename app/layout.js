import localFont from "next/font/local";
import "./globals.css";
import PWARegister from "./PWARegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "Martha Fashion | Boutique de mode",
  description:
    "Découvrez les créations Martha Fashion à Lomé-Djagblé. Commandez vos vêtements et contactez-nous sur WhatsApp.",
  applicationName: "Martha Fashion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Martha Fashion",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C49A52",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
