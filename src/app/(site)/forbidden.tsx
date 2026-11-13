import { headers } from "next/headers";
import { SlantButton } from "@/components/site/slant";
import { ErrorPage } from "@/components/site/error-page";
import { PATH_HEADER } from "@/lib/links";
import { getDict } from "@/lib/i18n/server";
import { auth } from "@/auth";
import { login } from "@/actions/auth";

export default async function Forbidden() {
  const [t, path, session] = await Promise.all([getDict(), headers().then((h) => h.get(PATH_HEADER) ?? ""), auth()]);
  // signed out: sign in and come straight back here (a discord link to a take page lands on this)
  if (!session?.user)
    return (
      <ErrorPage code={403} title={t.forbidden.title} text={t.forbidden.signedOut}>
        <form action={login.bind(null, path || "/")}>
          <SlantButton type="submit" tone="paper" className="px-5 py-2.5 text-base">
            {t.home.login}
          </SlantButton>
        </form>
      </ErrorPage>
    );
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
