export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{"html,body{background:transparent!important;margin:0;overflow:hidden;scrollbar-gutter:auto}html{font-size:18px!important}"}</style>
      <div className="light contents">{children}</div>
    </>
  );
}
