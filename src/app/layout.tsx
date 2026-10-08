import type { Metadata } from "next";
import { Archivo, Montserrat, Unbounded } from "next/font/google";
import { LangProvider } from "@/components/site/lang";
import { MotionProvider } from "@/components/site/motion";
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

const LITE = "try{var c=document.createElement(\"canvas\"),g=c.getContext(\"webgl\"),r=\"\";if(g){var e=g.getExtension(\"WEBGL_debug_renderer_info\");r=e?String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)):\"\";var x=g.getExtension(\"WEBGL_lose_context\");x&&x.loseContext()}if(!g||/swiftshader|llvmpipe|software|basic render/i.test(r)){var h=document.documentElement;h.classList.add(\"lite\")}}catch(_){}";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, settings] = await Promise.all([getLang(), getSettings()]);
  return (
    <html lang={lang} className={`${archivo.variable} ${unbounded.variable} ${montserrat.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LITE }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang} edition={settings.edition}>
          <MotionProvider>{children}</MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
