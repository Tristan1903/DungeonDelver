// =============================================================================
// 📘 FILE: app/layout.tsx
// =============================================================================
// 🎯 PURPOSE: The ROOT layout for the entire Next.js app. Every single page
//    is wrapped inside this layout. It sets up the HTML structure, fonts,
//    global CSS, and the Provider tree.
//
// 🧠 REACT CONCEPT: Next.js App Router — Root Layout
//    In Next.js App Router, `layout.tsx` is a SPECIAL file. It defines the
//    persistent shell around pages. Unlike a regular component:
//    - It renders ONCE when the app loads (not on every navigation)
//    - The `children` prop swaps out as you navigate between pages
//    - The layout DOES NOT re-render when the page changes (unless you use
//      hooks like usePathname inside it)
//
//    The component tree ends up looking like:
//      <html>
//        <body>
//          <TooltipProvider>
//            <RollLogProvider>
//              <RoleProvider>
//                <AppShell>      ← sidebar, dice log (persistent)
//                  <Page />      ← this swaps on navigation
//                </AppShell>
//              </RoleProvider>
//            </RollLogProvider>
//          </TooltipProvider>
//        </body>
//      </html>
//
// 💡 This file is a SERVER COMPONENT by default (no 'use client' directive).
//    Server components can import client components, but not vice versa.
//    Providers.tsx is a client component, so it acts as the "client boundary."
//
// 🔧 HOW TO ALTER:
//    - Add a new font: import it from next/font/google and add the className
//    - Change the page title: modify the metadata export
//    - Add analytics: add a <Script> tag or a provider
//    - Wrap with more providers: add them in the nesting tree
// =============================================================================

import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
// 🧠 next/font/google — Next.js built-in font optimization.
//    It automatically:
//    - Downloads the font at build time (not runtime from Google)
//    - Adds a CSS variable (--font-geist-mono) for use in styles
//    - Only loads the characters you need (subset: "latin")
//    This is WAY faster than a regular <link> tag to Google Fonts.
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import Providers from "../components/Providers";

// 🧠 Geist_Mono — Loading a monospace font with Next.js font system.
//    `variable: "--font-geist-mono"` creates a CSS variable with the font name.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🧠 `export const metadata` — Next.js special export for page metadata.
//    This sets the <title> and <meta name="description"> tags in the <head>.
//    Only works in SERVER components (no 'use client').
export const metadata: Metadata = {
  title: "Dungeon Delver",
  description: "Local-first D&D 5e desktop companion",
};

// 🧠 RootLayout — The outermost component. It's a SERVER component (no hooks).
//    `children` is the page content that changes on navigation.
//
// 🧠 `Readonly<{ children: React.ReactNode }>` — TypeScript utility wrapper.
//    Readonly makes the props object immutable. ReactNode means anything
//    renderable (JSX, strings, numbers, arrays, null, undefined).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 🧠 `className="dark"` — Forces dark mode on the entire app.
    //    Tailwind's `dark:` variant checks if a parent has class "dark".
    //    Since we hardcode it on <html>, ALL dark: classes are active.
    //    CSS variable `@custom-variant dark (&:is(.dark *))` uses this.
    //
    // 🧠 `geistMono.variable` — Adds the CSS variable for the mono font.
    //    `h-full` — full height. `antialiased` — smoother font rendering.
    <html lang="en" className={`dark ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* 🧠 Preconnect + Google Fonts link for MedievalSharp (the RPG heading font).
            Unlike Geist_Mono (loaded via JS), MedievalSharp uses a traditional
            <link> tag because it's not available via next/font.
            `preconnect` tells the browser to start the DNS handshake early. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function(){var d=document;var l=d.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap';d.head.appendChild(l);})();
          `
        }} />
        <noscript>
          <link href="https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap" rel="stylesheet" />
        </noscript>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* 🧠 TooltipProvider — shadcn/ui tooltip system. Must wrap the entire
            app so tooltips can position themselves globally. */}
        <TooltipProvider>
          {/* 🧠 Providers — Our custom wrapper that nests:
              RollLogProvider > RoleProvider > AppShell > {children} */}
          <Providers>{children}</Providers>
        </TooltipProvider>
      </body>
    </html>
  );
}
