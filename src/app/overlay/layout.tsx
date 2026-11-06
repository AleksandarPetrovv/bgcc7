export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* fixed 1920x1080 canvas scaled with zoom: rem stays at its 1080p size instead of following the window width */}
      <style>{"html,body{background:transparent!important;margin:0;overflow:hidden;scrollbar-gutter:auto}html{font-size:18px!important}"}</style>
      <div className="light contents">{children}</div>
    </>
  );
}
