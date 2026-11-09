import { headers } from "next/headers";
import { SlantButton } from "@/components/site/slant";
import { ErrorPage } from "@/components/site/error-page";
import { PATH_HEADER } from "@/lib/links";
import { getDict } from "@/lib/i18n/server";

export default async function Forbidden() {
  const [t, path] = await Promise.all([getDict(), headers().then((h) => h.get(PATH_HEADER) ?? "")]);
  return (
    <ErrorPage code={403} title={t.forbidden.title} text={path.startsWith("/admin") ? t.forbidden.admin : t.forbidden.text}>
      <SlantButton href="/" tone="paper" className="px-5 py-2.5 text-base">
        {t.forbidden.home}
      </SlantButton>
      <SlantButton href="/info" tone="outline" className="px-5 py-2.5 text-base">
        {t.home.readRules}
      </SlantButton>
    </ErrorPage>
  );
}
