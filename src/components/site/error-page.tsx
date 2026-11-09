/** the 404 / 403 / 500 page: big code, title, text, buttons; `data-error-page` turns on the full-viewport grain (foundation.css) */
export function ErrorPage({ code, title, text, children }: { code: number; title: string; text: string; children: React.ReactNode }) {
  return (
    <section data-error-page className="relative flex min-h-[70vh] items-center overflow-hidden">
      <div
        className="pointer-events-none absolute right-[4%] top-1/2 -translate-y-1/2 select-none font-display text-[clamp(14rem,34vw,30rem)] font-black italic leading-[0.8] text-paper/[0.05]"
        aria-hidden
      >
        <span className="in-right-far block [--d:0.1s]">{code}</span>
      </div>
      <div className="relative mx-auto w-full max-w-page px-4 sm:px-6 lg:px-10 2xl:px-14">
        <div className="in-up num text-[clamp(5rem,16vw,10rem)] leading-[0.85] text-rose [--d:0.1s]">{code}</div>
        <h1 className="in-up heading-slam mt-4 text-[clamp(2rem,6vw,3.5rem)] [--d:0.2s]">{title}</h1>
        <p className="in-up mt-3 max-w-[46ch] text-pretty text-lg text-paper/70 [--d:0.3s]">{text}</p>
        <div className="in-up mt-8 flex flex-wrap gap-3 [--d:0.4s]">{children}</div>
      </div>
    </section>
  );
}
