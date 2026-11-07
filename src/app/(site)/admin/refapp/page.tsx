import { permanentRedirect } from "next/navigation";

// old url: helpers built before the rename still open /admin/refapp
export default function OldHelperUrl() {
  permanentRedirect("/admin/helper");
}
