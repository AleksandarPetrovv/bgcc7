import { Backdrop } from "@/components/site/backdrop";

// bare like the overlay so OBS can show it as a browser source, but responsive so viewers can open it too
export default function DrawLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* OBS browser sources make the body transparent by default (shows black), so the page paints its own full-screen ground; no scrollbar on stream */}
      <div className="pointer-events-none fixed inset-0 -z-20 bg-ink" aria-hidden />
      <style>{"html{scrollbar-width:none}html::-webkit-scrollbar{display:none}"}</style>
      <Backdrop />
      <main className="mx-auto w-full max-w-[120rem] flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </>
  );
}
