export default function AdminLoading() {
  return (
    <div className="min-h-[110vh] animate-pulse" aria-busy="true">
      <div className="mb-8 border-b border-line pb-3">
        <div className="h-12 w-72 max-w-full -skew-x-12 bg-slate sm:h-14" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="border border-line bg-coal">
            <div className="border-b border-line px-5 py-4">
              <div className="h-6 w-40 -skew-x-12 bg-slate" />
            </div>
            <div className="space-y-3 p-5">
              <div className="h-10 bg-slate/70" />
              <div className="h-10 w-2/3 bg-slate/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
