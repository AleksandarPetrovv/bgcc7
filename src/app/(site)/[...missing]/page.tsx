import { notFound } from "next/navigation";

// a url no route matches would get next's bare 404; this sends it to the site's own (with nav and footer)
export default function Missing() {
  notFound();
}
