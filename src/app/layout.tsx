import type { Metadata } from "next";
import { Archivo, Barlow_Condensed, Montserrat, Roboto_Condensed, Unbounded } from "next/font/google";
import { SiteNav } from "@/components/site/site-nav";
import { Backdrop } from "@/components/site/backdrop";
import { LiteSettle } from "@/components/site/lite-settle";
import { SiteFooter } from "@/components/site/site-footer";
import { LangProvider } from "@/components/site/lang";
import { MotionProvider } from "@/components/site/motion";
import { getDict, getLang } from "@/lib/i18n/server";
import { TournamentProvider } from "@/components/site/tournament";
import { getMatches, getTeams } from "@/db/tournament";
import { auth } from "@/auth";
import { getViewer, getVisibility } from "@/lib/authz";
import { buildNav } from "@/lib/sections";
import { getLive } from "@/lib/twitch";
import { isLive } from "@/lib/matches";
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

const LITE = "try{var c=document.createElement(\"canvas\"),g=c.getContext(\"webgl\"),r=\"\";if(g){var e=g.getExtension(\"WEBGL_debug_renderer_info\");r=e?String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)):\"\";var x=g.getExtension(\"WEBGL_lose_context\");x&&x.loseContext()}if(!g||/swiftshader|llvmpipe|software|basic render/i.test(r)){var h=document.documentElement;h.classList.add(\"lite\")}}catch(_){}";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, session, viewer, vis, teams, matches] = await Promise.all([getLang(), auth(), getViewer(), getVisibility(), getTeams(), getMatches()]);
  const user = session?.user?.name ? { name: session.user.name, image: session.user.image ?? null, admin: !!viewer?.role } : null;
  const twitch = vis.sections.streams || vis.staff ? !!(await getLive()) : false;
  const live = [...(twitch ? ["streams"] : []), ...(matches.some(isLive) && (vis.sections.schedule || vis.staff) ? ["schedule"] : [])];
  return (
    <html lang={lang} className={`${archivo.variable} ${barlow.variable} ${unbounded.variable} ${montserrat.variable} ${robotoCondensed.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LITE }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LangProvider lang={lang}>
          <MotionProvider>
          <Backdrop />
          <LiteSettle />
          <SiteNav user={user} nav={buildNav(vis.sections, vis.staff)} register={vis.staff || vis.sections.register} live={live} />
          <TournamentProvider teams={teams} matches={matches}>
            <main className="flex-1">{children}</main>
          </TournamentProvider>
          <SiteFooter />
          </MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
