import { pageMeta } from "@/lib/page-meta";
import { Check } from "lucide-react";
import { Container, Tag } from "@/components/site/page";
import { PageTitle } from "@/components/site/page-title";
import { RegisterForm } from "@/components/site/register-form";
import { getDict, getLang } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";
import { getMe, regState } from "@/db/viewer";
import { getRegistration } from "@/db/registrations";
import { getSettings } from "@/db/settings";
import { getFill } from "@/db/copy";
import { getFormat } from "@/db/edition";
import { requireSection } from "@/lib/authz";
import { fmtSofia, tzLabel } from "@/lib/time";
import { avatarPath } from "@/lib/avatar";

import { localeOf } from "@/lib/i18n/locale";
export const generateMetadata = pageMeta("register");

export default async function Register() {
  await requireSection("register");
  const [t, lang, me, settings, f] = await Promise.all([getDict(), getLang(), getMe(), getSettings(), getFill()]);
  const user = me?.name ? { name: me.name, image: avatarPath(me.osuId) } : null;
  const status = me ? await getRegistration(me.osuId) : null;
  const state = regState(settings);
  const fmt = (d: Date | null) => (d ? `${fmtSofia(d, localeOf(lang))} ${tzLabel(d)}` : "");
  const tag =
    state === "open" ? (
      <Tag tone="balkan" className="text-xs">{settings.regClosesAt ? t.register.openTag(fmt(settings.regClosesAt)) : t.register.accent}</Tag>
    ) : state === "soon" ? (
      <Tag tone="paper" className="text-xs">{t.register.soonTag(fmt(settings.regOpensAt))}</Tag>
    ) : (
      <Tag tone="rose" className="text-xs">{t.register.closedTag}</Tag>
    );
  const done = user ? (status ? (status === "approved" ? 3 : 2) : 1) : 0;
  return (
    <Container plain>
      <PageTitle mark="glints" accent={t.register.accent} right={tag}>
        {getFormat().name}
      </PageTitle>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr]">
        <ol className="space-y-5">
          {t.register.steps.map((s, i) => (
            <li key={s.t} className="flex gap-4" style={{ "--i": i, "--s": "0.12s", "--d": "0.2s" } as React.CSSProperties}>
              <span className={cn("in-pop num flex size-11 shrink-0 items-center justify-center text-2xl", i < done ? "bg-balkan text-on-fill" : "border border-line text-ash")}>
                {i < done ? <Check className="size-5" /> : i + 1}
              </span>
              <div className="in-left" style={{ "--d": "0.3s" } as React.CSSProperties}>
                <div className="font-display font-bold">{s.t}</div>
                <p className="text-sm text-ash">{f(s.d)}</p>
              </div>
            </li>
          ))}
          <li className="in-up !mt-10 border border-rose/40 bg-rose/10 p-4 text-sm" style={{ "--d": "0.75s" } as React.CSSProperties}>
            <div className="mb-1 font-display font-bold text-rose-hi">{t.register.whoTitle}</div>
            {t.register.whoText}
          </li>
        </ol>

        <div className="in-right" style={{ "--d": "0.35s" } as React.CSSProperties}>
          <RegisterForm user={user} status={status} state={state} opensAt={fmt(settings.regOpensAt)} />
        </div>
      </div>
    </Container>
  );
}
