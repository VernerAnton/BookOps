import type { Metadata, Viewport } from "next";
import { Anton, Barlow_Condensed, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const barlow = Barlow_Condensed({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
});

const plex = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex",
});

const serif = Source_Serif_4({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-serif-text",
});

export const metadata: Metadata = {
  title: "BookOps",
  description: "ISBN queue, live Antikvaari pricing, and listing drafts for a bookstore selling on Antikvaari.",
};

export const viewport: Viewport = {
  themeColor: "#10120e",
};

const themeScript = `(function(){try{var t=localStorage.getItem("bookops-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${anton.variable} ${barlow.variable} ${plex.variable} ${serif.variable}`}>
        {children}
      </body>
    </html>
  );
}
