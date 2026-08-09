import type { Metadata } from "next";
import { Archivo, Barlow_Condensed, Montserrat, Roboto_Condensed, Unbounded } from "next/font/google";
import { SiteNav } from "@/components/site/site-nav";
import { SiteFooter } from "@/components/site/site-footer";
import { LangProvider } from "@/components/site/lang";
import { getDict, getLang } from "@/lib/i18n/server";
import { HiddenBar } from "@/components/site/hidden-bar";
import { auth } from "@/auth";
import { getViewer, getVisibility } from "@/lib/authz";
import { buildNav, SECTIONS } from "@/lib/sections";
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

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-c",
  subsets: ["cyrillic"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  adjustFontFallback: false,
  fallback: [],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "900"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return { title: t.meta.title, description: t.meta.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, session, viewer, vis] = await Promise.all([getLang(), auth(), getViewer(), getVisibility()]);
  const user = session?.user?.name ? { name: session.user.name, image: session.user.image ?? null, admin: !!viewer?.role } : null;
  const hidden = vis.staff ? SECTIONS.filter((s) => !vis.sections[s]) : [];
  return (
    <html lang={lang} className={`${archivo.variable} ${barlow.variable} ${unbounded.variable} ${montserrat.variable} ${robotoCondensed.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang}>
          <SiteNav user={user} nav={buildNav(vis.sections, vis.staff)} register={vis.staff || vis.sections.register} />
          <HiddenBar hidden={hidden} />
          <main className="flex-1">{children}</main>
          <SiteFooter sponsors={vis.staff || vis.sections.sponsors} />
        </LangProvider>
      </body>
    </html>
  );
}
