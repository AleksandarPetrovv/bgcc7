import type { Metadata } from "next";
import { Archivo, Montserrat, Unbounded } from "next/font/google";
import { LangProvider } from "@/components/site/lang";
import { MotionProvider } from "@/components/site/motion";
import { cookies } from "next/headers";
import { getDict, getLang } from "@/lib/i18n/server";
import { getSettings } from "@/db/settings";
import { getFill } from "@/db/copy";
import "./globals.css";

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
  return { title: f(t.meta.title), description: f(t.meta.description) };
}

// css animations stay paused until the streamed html and fonts are in; safari restarted them mid-load (title flashed)
const BOOT = "var h=document.documentElement;h.setAttribute(\"data-booting\",\"\");addEventListener(\"DOMContentLoaded\",function(){Promise.race([document.fonts.ready,new Promise(function(r){setTimeout(r,1000)})]).then(function(){requestAnimationFrame(function(){h.removeAttribute(\"data-booting\")})})});";
const LITE = "try{var h=document.documentElement,S=sessionStorage,q=location.search.match(/[?&]lite=([01])/);if(q)S.setItem(\"lite\",q[1]);var v=S.getItem(\"lite\");if(v===null){var c=document.createElement(\"canvas\"),g=c.getContext(\"webgl\"),r=\"\";if(g){var e=g.getExtension(\"WEBGL_debug_renderer_info\");r=e?String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)):\"\";var x=g.getExtension(\"WEBGL_lose_context\");x&&x.loseContext()}v=!g||/swiftshader|llvmpipe|software|basic render/i.test(r)?\"1\":\"0\";S.setItem(\"lite\",v)}if(v===\"1\")h.classList.add(\"lite\")}catch(_){}";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, settings, jar] = await Promise.all([getLang(), getSettings(), cookies()]);
  const dark = jar.get("theme")?.value === "dark";
  return (
    <html lang={lang} className={`${archivo.variable} ${unbounded.variable} ${montserrat.variable} h-full antialiased${dark ? " dark" : ""}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LITE }} />
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
        {/* safari can paint before the stylesheet applies; stay hidden until it does (globals.css reveals), 2s fallback */}
        <style>{"body{visibility:hidden;animation:fouc 0s 2s forwards}@keyframes fouc{to{visibility:visible}}"}</style>
      </head>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang} edition={settings.edition}>
          <MotionProvider>{children}</MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
