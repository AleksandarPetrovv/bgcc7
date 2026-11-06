// same as public pages: the route switches at once (sidebar stays) and the page streams in with its own intro
export default function AdminLoading() {
  return <div className="min-h-[110vh]" aria-busy="true" />;
}
