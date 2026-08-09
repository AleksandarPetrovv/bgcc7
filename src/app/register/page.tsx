import { Check } from "lucide-react";
import { Container, PageTitle, Tag } from "@/components/site/page";
import { RegisterForm } from "@/components/site/register-form";
import { getDict, getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import { getRegistration } from "@/db/registrations";
import { getSettings } from "@/db/settings";
import { requireSection } from "@/lib/authz";
import { fmtSofia, windowState } from "@/lib/time";

export default async function Register() {
  await requireSection("register");
  const [t, lang, session, settings] = await Promise.all([getDict(), getLang(), auth(), getSettings()]);
  const osuId = Number(session?.user?.id) || null;
  const user = osuId && session?.user?.name ? { name: session.user.name, image: session.user.image ?? null } : null;
  const status = osuId ? await getRegistration(osuId) : null;
  const state = windowState(settings.regOpensAt, settings.regClosesAt);
  const fmt = (d: Date | null) => (d ? `${fmtSofia(d, lang === "bg" ? "bg-BG" : "en-GB")} EET` : "");
  const tag =
    state === "open" ? (
      <Tag tone="balkan" className="text-xs">{settings.regClosesAt ? t.register.openTag(fmt(settings.regClosesAt)) : t.register.accent}</Tag>
    ) : state === "soon" ? (
      <Tag tone="paper" className="text-xs">{t.register.soonTag(fmt(settings.regOpensAt))}</Tag>
    ) : (
      <Tag tone="rose" className="text-xs">{t.register.closedTag}</Tag>
    );
  const done = user ? (status ? 2 : 1) : 0;
  return (
    <Container>
      <PageTitle accent={t.register.accent} right={tag}>
        BGCC7
      </PageTitle>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr]">
        <ol className="space-y-5">
          {t.register.steps.map((s, i) => (
            <li key={s.t} className="flex gap-4">
              <span className={cn("num flex size-11 shrink-0 items-center justify-center text-2xl", i < done ? "bg-balkan text-ink" : "border border-line text-ash")}>
                {i < done ? <Check className="size-5" /> : i + 1}
              </span>
              <div>
                <div className="font-black uppercase">{s.t}</div>
                <p className="text-sm text-ash">{s.d}</p>
              </div>
            </li>
          ))}
          <li className="!mt-10 border border-rose/40 bg-rose/10 p-4 text-sm">
            <div className="mb-1 font-black uppercase text-rose-hi">{t.register.whoTitle}</div>
            {t.register.whoText}
          </li>
        </ol>

        <RegisterForm user={user} status={status} state={state} opensAt={fmt(settings.regOpensAt)} />
      </div>
    </Container>
  );
}
