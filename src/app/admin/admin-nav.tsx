"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex overflow-x-auto p-2 lg:flex-col" aria-label="Admin">
      {items.map((i) => {
        const active = i.href === "/admin" ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-bold transition-colors",
              active ? "bg-rose text-white" : "text-paper/80 hover:bg-slate",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
