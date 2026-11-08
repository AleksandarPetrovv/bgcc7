import type { Metadata } from "next";
import { Archivo, Montserrat, Unbounded } from "next/font/google";
import { LangProvider } from "@/components/site/lang";
import { MotionProvider } from "@/components/site/motion";
import { LabelGuard } from "@/components/site/label-guard";
import { cookies } from "next/headers";
import { getDict, getLang } from "@/lib/i18n/server";
import { getFill } from "@/db/copy";
import { getFormat } from "@/db/edition";
import "./globals.css";
import { LITE } from "@/lib/lite";
import { BOOT } from "@/lib/fonts-ready";
import { THEME_COOKIE } from "@/lib/i18n/locale";
import { currentEdition, ensureEdition } from "@/db";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  adjustFontFallback: false,
  fallback: [],
});

const montserrat = Montserrat({
  variable: "--font-mont",
  subsets: ["cyrillic"],
  style: ["normal", "italic"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "900"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [t, f] = await Promise.all([getDict(), getFill()]);
  return { title: { default: f(t.meta.title), template: `%s · ${getFormat().name}` }, description: f(t.meta.description) };
}

// css animations stay paused until the streamed html and fonts are in; safari restarted them mid-load (title flashed)
const LITE_BOOT = `try{var h=document.documentElement,S=sessionStorage,L="${LITE}",q=location.search.match(/[?&]lite=([01])/);if(q)S.setItem(L,q[1]);var v=S.getItem(L);if(v===null){var c=document.createElement("canvas"),g=c.getContext("webgl"),r="";if(g){var e=g.getExtension("WEBGL_debug_renderer_info");r=e?String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)):"";var x=g.getExtension("WEBGL_lose_context");x&&x.loseContext()}v=!g||/swiftshader|llvmpipe|software|basic render/i.test(r)?"1":"0";S.setItem(L,v)}if(v==="1")h.classList.add(L)}catch(_){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, , jar] = await Promise.all([getLang(), ensureEdition(), cookies()]);
  const dark = jar.get(THEME_COOKIE)?.value === "dark";
  return (
    <html lang={lang} className={`${archivo.variable} ${unbounded.variable} ${montserrat.variable} h-full antialiased${dark ? " dark" : ""}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LITE_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        {/* safari can paint before the stylesheet applies; stay hidden until it does (globals.css reveals), 2s fallback */}
        <style>{"body{visibility:hidden;animation:fouc 0s 2s forwards}@keyframes fouc{to{visibility:visible}}"}</style>
      </head>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang} edition={currentEdition()}>
          <LabelGuard />
          <MotionProvider>{children}</MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
